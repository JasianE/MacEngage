# Live Group Engagement Monitor — Device-Side

Real-time engagement monitoring system for Raspberry Pi 5. Uses a Teachable Machine TFLite model to classify seated-group behaviors via camera, computes a weighted engagement score every 5 seconds, and emits anonymized aggregate metrics to Firebase Firestore.

## Features

- **Real-time inference**: TFLite model classifies 8 behavior types at ≥5 FPS
- **Engagement scoring**: Configurable weighted scoring with live terminal indicator
- **Session lifecycle**: Formal start/end with unique IDs, overlap prevention, and summaries
- **Firestore emission**: Tick-by-tick and session-level data for dashboard consumption
- **Configurable weights**: Edit `config/weights.json` — changes apply on next session start
- **Synthetic sessions**: Generate realistic historical data for dashboard demos
- **Privacy-first**: No per-person data, no media storage, no identification

## Quick Start

See the full setup guide: [quickstart.md](../specs/001-engagement-monitor/quickstart.md)

```bash
# Setup (on Raspberry Pi 5)
cd device
python3 -m venv --system-site-packages .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set Firebase credentials
export GOOGLE_APPLICATION_CREDENTIALS="config/service-account-key.json"

# Place model files
cp model_unquant.tflite model/
cp labels.txt model/

# Run
python -m engagement_monitor
```

## Commands

| Key | Action |
|-----|--------|
| `s` | Start a new session |
| `e` | End the active session |
| `q` | Quit the application |

## Synthetic Data

```bash
# Write 5 synthetic sessions to Firestore
python -m synthetic --sessions 5

# Preview without writing (dry run)
python -m synthetic --sessions 3 --dry-run
```

## Training Photo Capture (for Teachable Machine)

Use the Pi camera to collect labeled training photos with an Enter-to-start / Enter-to-stop flow.

### 1) Configure capture settings

Edit `config/training_capture.json`:

```json
{
  "outputDir": "training_data",
  "label": "engaged",
  "intervalSeconds": 0.5,
  "width": 640,
  "height": 480,
  "imageFormat": "jpg",
  "jpegQuality": 95,
  "maxPhotosPerRun": 0,
  "flip180": true,
  "swapRedBlue": true
}
```

- Set `label` to the class you are collecting (example: `engaged`, `distracted`).
- Set `maxPhotosPerRun` to `0` for unlimited photos until you stop manually.
- Keep `flip180: true` for upside-down camera mounting.
- Keep `swapRedBlue: true` if colors look incorrect (red/blue channel swap).

### 2) Run capture

```bash
python -m training_capture
```

Controls while running:
- Press **Enter** once to **start** taking photos
- Press **Enter** again to **stop**
- Press **Ctrl+C** to quit

Photos are saved to: `training_data/<label>/`

### 3) Collect multiple classes

After finishing one class, change `label` in `config/training_capture.json` and run the script again.
Upload each label folder to Google Teachable Machine as separate classes.

## Project Structure

```
device/
├── config/weights.json          # Behavior weights & scoring config
├── config/training_capture.json # Training photo capture config
├── model/                       # TFLite model files (not in git)
├── schemas/                     # JSON schemas for payload validation
├── engagement_monitor/          # Main application package
│   ├── main.py                  # Session loop & tick orchestration
│   ├── camera.py                # picamera2 frame capture
│   ├── detector.py              # TFLite inference
│   ├── scorer.py                # Behavior → engagement score
│   ├── session.py               # Session lifecycle management
│   ├── emitter.py               # Firestore writes
│   ├── indicator.py             # Terminal display
│   ├── config.py                # Weight config loading & validation
│   └── schemas.py               # Payload construction
├── training_capture/            # Teachable Machine data collection
│   └── __main__.py              # CLI entry point
└── synthetic/                   # Synthetic data generation
    ├── generator.py             # Session data generator
    └── __main__.py              # CLI entry point
```

## Specification

Full feature specification and design documents are in [`specs/001-engagement-monitor/`](../specs/001-engagement-monitor/).
