"""Camera capture module wrapping picamera2 for frame acquisition."""

import importlib
import logging
import sys
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)


def _import_picamera2():
    """Import Picamera2, with a fallback for apt-installed system packages.

    On Raspberry Pi OS, `python3-picamera2` is installed into
    `/usr/lib/python3/dist-packages`, which may be hidden from an existing venv
    that was not created with `--system-site-packages`.
    """
    try:
        from picamera2 import Picamera2  # type: ignore

        return Picamera2
    except ModuleNotFoundError:
        pass

    fallback_paths = [
        Path("/usr/lib/python3/dist-packages"),
        Path(f"/usr/lib/python{sys.version_info.major}/dist-packages"),
    ]
    for p in fallback_paths:
        p_str = str(p)
        if p.exists() and p_str not in sys.path:
            sys.path.append(p_str)

    module = importlib.import_module("picamera2")
    return module.Picamera2


class Camera:
    """Wraps picamera2 to provide simple frame capture.

    Configured for 640x480 RGB888 preview for low-latency continuous capture.
    """

    def __init__(self, width: int = 640, height: int = 480):
        self._width = width
        self._height = height
        self._picam2 = None

    def start(self) -> None:
        """Initialize and start the camera."""
        # Import here to allow running on non-Pi systems (tests, dev)
        try:
            Picamera2 = _import_picamera2()
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "picamera2 is not importable in this Python environment. "
                "Install system package: sudo apt update && sudo apt install -y python3-picamera2. "
                "If already installed, recreate venv with --system-site-packages "
                "or set PYTHONPATH=/usr/lib/python3/dist-packages."
            ) from exc

        self._picam2 = Picamera2()
        config = self._picam2.create_preview_configuration(
            main={"size": (self._width, self._height), "format": "RGB888"}
        )
        self._picam2.configure(config)
        self._picam2.start()
        logger.info("Camera started at %dx%d RGB888", self._width, self._height)

    def capture_frame(self) -> np.ndarray:
        """Capture a single frame as a numpy RGB array.

        Returns:
            numpy array of shape (height, width, 3) with dtype uint8, RGB order.

        Raises:
            RuntimeError: If camera has not been started.
        """
        if self._picam2 is None:
            raise RuntimeError("Camera not started. Call start() first.")
        frame = self._picam2.capture_array("main")
        return frame

    def stop(self) -> None:
        """Stop the camera and release resources."""
        if self._picam2 is not None:
            self._picam2.stop()
            self._picam2.close()
            self._picam2 = None
            logger.info("Camera stopped")
