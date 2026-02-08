# EngageMint Development Guidelines



Auto-generated from all feature plans. Last updated: 2026-02-07



## Active Technologies

- Python 3.11 (Bookworm default) + `tflite-runtime` (v2.14+), `picamera2` (via apt), `firebase-admin` (v7.x), `numpy`, `Pillow` (001-engagement-monitor)

- Firebase Firestore (cloud), JSON config files (local) (001-engagement-monitor)



## Project Structure



```text

EngageMintBackend/

  engagement_monitor/

  synthetic/

  tests/

  config/

  model/

EngageMintFrontend/

```



## Commands



cd EngageMintBackend; pytest tests/ -v; python -m engagement_monitor.main



## Code Style



Python 3.11: Follow standard conventions (PEP8, type hints, docstrings)



## Recent Changes

- 001-engagement-monitor: Added Python 3.11 (Bookworm default) + `tflite-runtime` (v2.14+), `picamera2` (via apt), `firebase-admin` (v7.x), `numpy`, `Pillow`



<!-- MANUAL ADDITIONS START -->

<!-- MANUAL ADDITIONS END -->

