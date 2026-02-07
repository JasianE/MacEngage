"""TFLite model loading and behavior detection inference."""

import logging
from pathlib import Path

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

_MODEL_DIR = Path(__file__).resolve().parent.parent / "model"
_DEFAULT_MODEL_PATH = _MODEL_DIR / "model_unquant.tflite"
_DEFAULT_LABELS_PATH = _MODEL_DIR / "labels.txt"


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
                label = parts[1] if len(parts) > 1 else parts[0]
                labels.append(label)
    return labels


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
        logger.info(
            "Model loaded from %s — input shape: %s", self._model_path, input_shape
        )

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

        # Resize to 224x224 using PIL
        img = Image.fromarray(frame)
        img = img.resize((224, 224))
        input_data = np.array(img, dtype=np.float32)

        # Normalize to [-1, 1] per Teachable Machine convention
        input_data = (input_data / 127.5) - 1.0
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

        logger.debug(
            "Inference: %d detections above %.2f threshold",
            len(detections),
            confidence_threshold,
        )
        return detections
