# Quickstart: Live Group Engagement Monitor — Device-Side

**Feature**: `001-engagement-monitor`  
**Date**: 2026-02-07

---

## Prerequisites

| Requirement | Details |
|---|---|
| **Hardware** | Raspberry Pi 5 (4GB+ RAM) with Pi Camera Module (v2 or v3) |
| **OS** | Raspberry Pi OS Bookworm (Debian 12, ARM64) |
| **Python** | 3.11 (Bookworm default) |
| **Network** | Wi-Fi or Ethernet with internet access (for Firebase) |
| **Firebase** | A Firebase project with Firestore enabled and a service account key |

---

## 1. System Setup (Pi)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y \
  python3-picamera2 --no-install-recommends \
  python3-numpy \
  python3-venv \
  build-essential \
  python3-dev

# Verify camera is detected
libcamera-hello --list-cameras
```

## 2. Project Setup

```bash
# Clone the repo
git clone <repo-url> ~/MacEngage
cd ~/MacEngage/device

# Create venv with access to system-installed picamera2
python3 -m venv --system-site-packages .venv
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt
```

## 3. Firebase Configuration

```bash
# Copy your Firebase service account key to the device
scp service-account-key.json pi@<pi-ip>:~/MacEngage/device/config/

# Set environment variable (add to ~/.bashrc for persistence)
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/MacEngage/device/config/service-account-key.json"
```

## 4. Weight Configuration (optional)

Edit `config/weights.json` to customize behavior weights. Defaults are pre-populated:

```json
{
  "raising_hand": 100,
  "writing_notes": 80,
  "looking_at_board": 75,
  "on_phone": 0,
  "head_down": 0,
  "talking_to_group": 15,
  "hands_on_head": 30,
  "looking_away_long": 20,
  "confidenceThreshold": 0.6,
  "tickIntervalSeconds": 5
}
```

## 5. Model Setup

Place your Teachable Machine TFLite export files in the model directory:

```bash
# After exporting from Teachable Machine as "TensorFlow Lite (Floating point)":
cp model_unquant.tflite ~/MacEngage/device/model/
cp labels.txt ~/MacEngage/device/model/
```

## 6. Run

### Live session (with camera)

```bash
cd ~/MacEngage/device
source .venv/bin/activate
python -m engagement_monitor.main
```

**Controls during a session:**
- Press `s` + Enter → start a new session
- Press `e` + Enter → end the current session
- Press `q` + Enter → quit the application

The terminal will display a glanceable color-coded engagement bar that updates every tick.

### Generate synthetic demo sessions

```bash
python -m engagement_monitor.synthetic --sessions 5
```

This writes 5 synthetic historical sessions to Firestore with realistic engagement patterns.

## 7. Verify

```bash
# Run tests
pytest tests/ -v

# Validate JSON payloads against schema
pytest tests/contract/ -v
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `libcamera` not found | Run `sudo apt install libcamera-apps` |
| Camera not detected | Check ribbon cable connection; run `libcamera-hello --list-cameras` |
| `tflite-runtime` install fails | Use fallback: `pip install https://github.com/feranick/TFlite-builds/releases/download/v2.17.1/tflite_runtime-2.17.1-cp311-cp311-linux_aarch64.whl` |
| `grpcio` compile takes forever | Ensure pip ≥ 23.0 (`pip install --upgrade pip`) to get pre-built ARM64 wheels |
| Firebase auth error | Verify `GOOGLE_APPLICATION_CREDENTIALS` points to valid service account key |
| `picamera2` import error in venv | Ensure venv created with `--system-site-packages` |
