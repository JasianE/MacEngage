u"""CLI entry point for config-driven training photo capture.

Usage:
    python -m training_capture

Controls:
    Press Enter to start capture
    Press Enter again to stop capture
    Press Ctrl+C to quit
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image

from engagement_monitor.camera import Camera

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "training_capture.json"
_DEFAULT_CONFIG = {
    "outputDir": "training_data",
    "label": "engaged",
    "intervalSeconds": 0.5,
    "width": 640,
    "height": 480,
    "imageFormat": "jpg",
    "jpegQuality": 95,
    "maxPhotosPerRun": 0,
    "flip180": True,
    "swapRedBlue": True,
}


def _load_config(path: Path = _CONFIG_PATH) -> dict:
    if not path.exists():
        logger.warning("Config %s not found, using defaults", path)
        return dict(_DEFAULT_CONFIG)

    with open(path, "r", encoding="utf-8") as f:
        user_cfg = json.load(f)

    cfg = dict(_DEFAULT_CONFIG)
    cfg.update(user_cfg)

    cfg["intervalSeconds"] = max(0.05, float(cfg["intervalSeconds"]))
    cfg["width"] = int(cfg["width"])
    cfg["height"] = int(cfg["height"])
    cfg["jpegQuality"] = max(1, min(100, int(cfg["jpegQuality"])))
    cfg["label"] = str(cfg["label"]).strip() or "engaged"
    cfg["imageFormat"] = str(cfg["imageFormat"]).lower().strip() or "jpg"
    cfg["maxPhotosPerRun"] = max(0, int(cfg.get("maxPhotosPerRun", 0)))
    cfg["flip180"] = bool(cfg.get("flip180", True))
    cfg["swapRedBlue"] = bool(cfg.get("swapRedBlue", True))

    return cfg


def _capture_loop(
    camera: Camera,
    out_dir: Path,
    cfg: dict,
    stop_event: threading.Event,
) -> int:
    interval = cfg["intervalSeconds"]
    fmt = cfg["imageFormat"]
    quality = cfg["jpegQuality"]
    max_photos = cfg["maxPhotosPerRun"]
    flip180 = cfg["flip180"]
    swap_rb = cfg["swapRedBlue"]

    count = 0
    print(f"[CAPTURE] Saving to: {out_dir}")

    while not stop_event.is_set():
        try:
            frame = camera.capture_frame()

            if swap_rb:
                frame = frame[:, :, ::-1]

            image = Image.fromarray(np.ascontiguousarray(frame))
            if flip180:
                image = image.transpose(Image.ROTATE_180)

            ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            file_path = out_dir / f"{cfg['label']}_{ts}.{fmt}"
            out_dir.mkdir(parents=True, exist_ok=True)

            save_kwargs = {}
            if fmt in {"jpg", "jpeg"}:
                save_kwargs["quality"] = quality
            image.save(file_path, **save_kwargs)

            count += 1
            print(f"[CAPTURE] #{count}: {file_path.name}")
        except Exception as exc:
            logger.exception("Capture/save error")
            print(f"[ERROR] Capture/save failed: {exc}")
            stop_event.set()
            break

        if max_photos > 0 and count >= max_photos:
            print(f"[CAPTURE] Reached maxPhotosPerRun={max_photos}; auto-stopping.")
            stop_event.set()
            break

        stop_event.wait(timeout=interval)

    return count


def main() -> None:
    cfg = _load_config()
    base_dir = Path(__file__).resolve().parent.parent
    output_root = base_dir / cfg["outputDir"]
    output_dir = output_root / cfg["label"]
    output_dir.mkdir(parents=True, exist_ok=True)

    camera = Camera(width=cfg["width"], height=cfg["height"])
    camera.start()

    print("=" * 64)
    print("  Training Photo Capture (Teachable Machine)")
    print("=" * 64)
    print(f"  Config: {_CONFIG_PATH}")
    print(f"  Label: {cfg['label']}")
    print(f"  Output: {output_dir}")
    print(f"  Resolution: {cfg['width']}x{cfg['height']}")
    print(f"  Interval: {cfg['intervalSeconds']}s")
    print(f"  flip180: {cfg['flip180']} | swapRedBlue: {cfg['swapRedBlue']}")
    print("  Control: Press Enter to START, Enter again to STOP, Ctrl+C to quit")
    print("=" * 64)

    running = False
    stop_event = threading.Event()
    capture_thread: threading.Thread | None = None
    run_photo_count = 0

    def _run_capture() -> None:
        nonlocal run_photo_count
        run_photo_count = _capture_loop(camera, output_dir, cfg, stop_event)

    try:
        while True:
            input()
            if not running:
                stop_event.clear()
                run_photo_count = 0
                capture_thread = threading.Thread(target=_run_capture, daemon=True)
                capture_thread.start()
                running = True
                print("[STATE] Capture started.")
            else:
                stop_event.set()
                if capture_thread is not None:
                    capture_thread.join(timeout=5)
                running = False
                print(f"[STATE] Capture stopped. Photos this run: {run_photo_count}")
                print("[STATE] Press Enter to start again, or Ctrl+C to quit.")

    except KeyboardInterrupt:
        print("\n[INFO] Exiting...")
    finally:
        if running:
            stop_event.set()
            if capture_thread is not None:
                capture_thread.join(timeout=5)
        camera.stop()


if __name__ == "__main__":
    main()
