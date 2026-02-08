"""TFLite model loading and behavior detection inference."""

import json
import logging
import re
from pathlib import Path

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

_MODEL_DIR = Path(__file__).resolve().parent.parent / "model"
_DEFAULT_MODEL_PATH = _MODEL_DIR / "model_unquant.tflite"
_DEFAULT_LABELS_PATH = _MODEL_DIR / "labels.txt"
_TRAINING_CAPTURE_CONFIG_PATH = (
    Path(__file__).resolve().parent.parent / "config" / "training_capture.json"
)

_LABEL_ALIASES = {
    "hands_on_head": "hands_on_head",
    "head_down": "head_down",
    "looking_at_the_board": "looking_at_board",
    "looking_at_board": "looking_at_board",
    "looking_away": "looking_away_long",
    "on_phone": "on_phone",
    "raising_hand": "raising_hand",
    "talking_to_each_other": "talking_to_group",
    "talking_to_group": "talking_to_group",
    "writing_notes": "writing_notes",
}


def _canonicalize_label(raw_label: str) -> str:
    """Convert arbitrary label text to a config-compatible behavior key."""
    normalized = re.sub(r"[^a-z0-9]+", "_", raw_label.strip().lower()).strip("_")
    return _LABEL_ALIASES.get(normalized, normalized)


def _load_labels(labels_path: Path) -> list[str]:
    """Load class labels from labels.txt.

    Each line is formatted as '<index> <label>' (e.g., '0 raising_hand').

    Returns:
        List of label strings ordered by index.
    """
    labels = []
    with open(labels_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                # Format: "0 raising_hand" — split on first space
                parts = line.split(maxsplit=1)
                raw_label = parts[1] if len(parts) > 1 else parts[0]
                label = _canonicalize_label(raw_label)
                labels.append(label)
    return labels


def _load_preprocessing_from_training_capture_config(
    config_path: Path = _TRAINING_CAPTURE_CONFIG_PATH,
) -> tuple[bool, bool]:
    """Load frame preprocessing options that were used during data capture.

    Returns:
        (flip180, swap_red_blue)
    """
    flip180 = False
    swap_red_blue = False

    if not config_path.exists():
        return flip180, swap_red_blue

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        flip180 = bool(cfg.get("flip180", False))
        swap_red_blue = bool(cfg.get("swapRedBlue", False))
    except (json.JSONDecodeError, OSError):
        logger.warning("Could not read training capture config at %s", config_path)

    return flip180, swap_red_blue


def _apply_frame_preprocessing(
    frame: np.ndarray,
    *,
    flip180: bool,
    swap_red_blue: bool,
) -> np.ndarray:
    """Apply capture-time transforms to match model training inputs."""
    out = frame
    if swap_red_blue:
        out = out[:, :, ::-1]
    if flip180:
        out = np.rot90(out, 2)
    return np.ascontiguousarray(out)


class Detector:
    """TFLite-based behavior detector.

    Loads a Teachable Machine TFLite model and classifies frames into
    behavior categories with confidence scores.
    """

    def __init__(
        self,
        model_path: str | Path | None = None,
        labels_path: str | Path | None = None,
    ):
        self._model_path = Path(model_path) if model_path else _DEFAULT_MODEL_PATH
        self._labels_path = Path(labels_path) if labels_path else _DEFAULT_LABELS_PATH
        self._interpreter = None
        self._labels: list[str] = []
        self._input_details = None
        self._output_details = None
        self._input_height = 224
        self._input_width = 224
        self._input_dtype = np.float32
        self._flip180 = False
        self._swap_red_blue = False

    def load(self) -> None:
        """Load the TFLite model and labels."""
        # Import tflite_runtime; fall back to tf.lite if needed
        try:
            from tflite_runtime.interpreter import Interpreter
        except ImportError:
            from tensorflow.lite.python.interpreter import Interpreter

        self._labels = _load_labels(self._labels_path)
        logger.info("Loaded %d labels from %s", len(self._labels), self._labels_path)

        self._interpreter = Interpreter(model_path=str(self._model_path))
        self._interpreter.allocate_tensors()

        self._input_details = self._interpreter.get_input_details()
        self._output_details = self._interpreter.get_output_details()

        input_shape = self._input_details[0]["shape"]
        self._input_height = int(input_shape[1])
        self._input_width = int(input_shape[2])
        self._input_dtype = self._input_details[0]["dtype"]
        self._flip180, self._swap_red_blue = (
            _load_preprocessing_from_training_capture_config()
        )
        logger.info(
            "Model loaded from %s — input shape: %s dtype=%s",
            self._model_path,
            input_shape,
            self._input_dtype,
        )
        logger.info(
            "Inference preprocessing: flip180=%s swapRedBlue=%s",
            self._flip180,
            self._swap_red_blue,
        )
        logger.info("Label mapping: %s", self._labels)

    def detect(
        self, frame: np.ndarray, confidence_threshold: float = 0.6
    ) -> list[tuple[str, float]]:
        """Run inference on a frame and return detected behaviors.

        Args:
            frame: numpy RGB array of any size (will be resized to 224x224).
            confidence_threshold: Minimum confidence to include a detection.

        Returns:
            List of (behavior_label, confidence) tuples above the threshold.

        Raises:
            RuntimeError: If model has not been loaded.
        """
        if self._interpreter is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        # Apply same transforms used during training photo capture.
        frame = _apply_frame_preprocessing(
            frame,
            flip180=self._flip180,
            swap_red_blue=self._swap_red_blue,
        )

        # Resize according to model input shape
        img = Image.fromarray(frame)
        img = img.resize((self._input_width, self._input_height))
        input_data = np.array(img, dtype=np.float32)

        # Preprocess according to input tensor dtype.
        if self._input_dtype == np.float32:
            # Teachable Machine float models expect [-1, 1].
            input_data = (input_data / 127.5) - 1.0
        else:
            input_data = input_data.astype(self._input_dtype)

        input_data = np.expand_dims(input_data, axis=0)  # (1, 224, 224, 3)

        self._interpreter.set_tensor(self._input_details[0]["index"], input_data)
        self._interpreter.invoke()

        output_data = self._interpreter.get_tensor(self._output_details[0]["index"])
        probabilities = output_data[0]  # shape: (N,) softmax

        detections = []
        for idx, confidence in enumerate(probabilities):
            conf = float(confidence)
            if conf >= confidence_threshold and idx < len(self._labels):
                detections.append((self._labels[idx], conf))

        if detections:
            label, conf = max(detections, key=lambda d: d[1])
            logger.info("state=%s conf=%.2f", label, conf)
        else:
            logger.info("state=none")

        logger.debug(
            "Inference: %d detections above %.2f threshold",
            len(detections),
            confidence_threshold,
        )
        return detections
