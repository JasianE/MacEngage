# Research: Live Group Engagement Monitor — Device-Side System

**Feature**: `001-engagement-monitor`  
**Date**: 2026-02-07

---

## R1: Teachable Machine TFLite Export Format

**Decision**: Use the standard Teachable Machine TFLite export (`model_unquant.tflite` + `labels.txt`), loaded via `tflite-runtime` on the Pi.

**Rationale**: Teachable Machine exports a well-defined format — a MobileNet-based image classifier as a `.tflite` file with a companion `labels.txt`. The input/output contract is stable and well-documented. This is the simplest path from training to on-device inference.

**Alternatives Considered**:
- **Full TensorFlow**: Too heavy (~500 MB) for a Pi-constrained environment. Rejected for simplicity.
- **ONNX Runtime**: Would require model conversion step. Adds complexity with no benefit.
- **Custom-trained PyTorch model**: Out of scope — user specified Teachable Machine.

**Key Details**:
| Property | Value |
|---|---|
| Export files | `model_unquant.tflite` (float32), `labels.txt` (one label per line) |
| Input tensor | `[1, 224, 224, 3]` float32, RGB, normalized to [-1.0, 1.0] via `(pixel / 127.5) - 1` |
| Output tensor | `[1, N]` float32 softmax probabilities, N = number of classes |
| Labels format | `<index> <label>` per line, matching output tensor indices |

---

## R2: TFLite Runtime on Raspberry Pi 5 ARM64

**Decision**: Install `tflite-runtime` via PyPI (v2.14.0 has `cp311-linux_aarch64` wheel). Fallback to feranick community wheel v2.17.1 if needed.

**Rationale**: The official PyPI wheel v2.14.0 ships an ARM64 wheel for Python 3.11, which is the Bookworm default. This is the lightest path (~5 MB vs. 500 MB for full TensorFlow).

**Alternatives Considered**:
- **feranick/TFlite-builds**: Community fork with v2.17.1 wheel for `cp311-linux_aarch64`. Viable fallback if PyPI wheel has issues. URL: `https://github.com/feranick/TFlite-builds/releases`
- **Full TensorFlow**: Works but oversized. Rejected per Simplicity principle.
- **Build from source**: Too slow for hackathon — cross-compile via Docker takes 30+ min. Last resort.

**Install Sequence**:
```bash
pip install tflite-runtime  # try official first
# fallback:
pip install https://github.com/feranick/TFlite-builds/releases/download/v2.17.1/tflite_runtime-2.17.1-cp311-cp311-linux_aarch64.whl
```

---

## R3: Camera Capture with picamera2 on Pi 5

**Decision**: Use `picamera2` installed via `apt` (not pip). Use `create_preview_configuration` for continuous capture and `capture_array("main")` to get numpy RGB frames.

**Rationale**: `picamera2` is the official, Raspberry Pi Foundation-maintained library for the `libcamera` stack on Pi 5. Installing via `apt` ensures `libcamera` version compatibility. It natively returns numpy arrays — no PIL/file round-trip needed.

**Alternatives Considered**:
- **OpenCV `VideoCapture`**: Can work via V4L2 but less reliable on Pi 5 — `picamera2` is the recommended path. Would lose access to Pi-specific camera controls.
- **Old `picamera`**: Incompatible with Pi 5's `libcamera` stack. Not an option.

**Key Details**:
| Property | Value |
|---|---|
| Install method | `sudo apt install python3-picamera2 --no-install-recommends` (headless) |
| Venv approach | `python3 -m venv --system-site-packages .venv` to expose apt package |
| Frame format | `"RGB888"` → numpy `uint8` array shape `(H, W, 3)` in RGB order |
| Capture call | `picam2.capture_array("main")` — returns numpy array directly |
| Continuous mode | `create_preview_configuration` for low-latency streaming |
| Hardware FPS limit | `picam2.set_controls({"FrameRate": 5.0})` to reduce CPU/power |

**Known Pi 5 Caveats**:
- Avoid `pip install picamera2` — use `apt` to prevent `libcamera` version mismatches.
- On headless/Lite, skip `start_preview()` — just use `start()`.
- Stick to NumPy < 2.0 (use apt-provided `python3-numpy`) for stability.

---

## R4: Firebase Cloud Integration

**Decision**: Use Firestore (not Realtime Database) via `firebase-admin` Python SDK with service account authentication. Structure as subcollections per session under a device document.

**Rationale**: Firestore offers structured collections, rich querying (timestamp range, ordering), TTL auto-delete, and real-time snapshot listeners for the dashboard. The `firebase-admin` SDK is pure Python and fully ARM64-compatible.

**Alternatives Considered**:
- **Realtime Database**: Simpler setup but single JSON tree becomes unwieldy for time-series data. Lacks compound queries and TTL. Rejected for data model limitations.
- **Direct REST API**: Would avoid the SDK dependency but loses typing, retry logic, and server timestamps. Unnecessary complexity.
- **MQTT → Cloud Function → Firestore**: Adds a message broker layer. Overkill for a hackathon. Rejected per Simplicity principle.

**Key Details**:
| Property | Value |
|---|---|
| SDK | `firebase-admin` (v7.x, pure Python, ARM64 compatible) |
| Auth | Service account JSON key (`GOOGLE_APPLICATION_CREDENTIALS` env var) |
| Write pattern | `db.collection("sessions/{sid}/liveData").add({timeSinceStart, engagementScore})` |
| Timestamp | `firestore.SERVER_TIMESTAMP` for consistent ordering |
| Dashboard reads | `onSnapshot` listener with timestamp range queries |
| Cost at 1 write/5s | ~17K writes/day — well within Firestore free tier (50K/day) |

**Firestore Collection Structure**:
```
/sessions/{sessionId}                     ← {title, overallScore, comments}
/sessions/{sessionId}/liveData/{auto_id}  ← {timeSinceStart, engagementScore}
```

**Install Notes**:
- `pip install firebase-admin` pulls `grpcio` which has ARM64 wheels.
- Ensure `pip >= 23.0` for proper ARM64 wheel resolution.
- Pre-install `build-essential python3-dev` as safety net for any source builds.

---

## R5: Glanceable Local Indicator

**Decision**: Use terminal-based ANSI output — a single-line updating display showing a color-coded engagement bar and numeric score. No external library dependency needed; optionally use `rich` for a cleaner look.

**Rationale**: The Pi runs headless; the facilitator may SSH in or glance at a connected monitor. A simple terminal output is the lowest-friction approach. No GUI framework, no web server, no LED hardware needed. Meets the "glanceable" requirement with a color-coded bar (green/yellow/red) and numeric score.

**Alternatives Considered**:
- **Physical LED (NeoPixel/WS2812)**: More visually impressive but requires extra hardware + wiring. Out of scope for hackathon MVP.
- **Local web page**: Requires running an HTTP server on the Pi. Adds a moving part and violates Simplicity. Also risks exposing an endpoint (Constitution concern).
- **`rich` library**: Nice but adds a dependency. Plain ANSI escape codes achieve the same result.

**Implementation Approach**:
```python
# Plain ANSI — no dependencies
def show_indicator(score: int) -> None:
    if score >= 70:
        color = "\033[92m"  # green
    elif score >= 40:
        color = "\033[93m"  # yellow
    else:
        color = "\033[91m"  # red
    bar = "█" * (score // 5) + "░" * (20 - score // 5)
    print(f"\r{color}Engagement: [{bar}] {score:3d}/100\033[0m", end="", flush=True)
```

---

## R6: Scoring Logic — Score-Only Demo Mode

**Decision**: For each tick, compute engagement from detected behavior labels only and emit a score-only payload (no people counts, no behavior summary fields).

**Rationale**: The demo model outputs group-level behavior predictions rather than per-person tracking. Score-only payloads keep contracts simple, align with privacy goals, and avoid implying unsupported person-count precision.

**Formula**:
```
For K detected labels in a tick, with behavior b_i:
  raw_score = (1/K) * Σ weight(b_i)  for i in 1..K
  engagement_score = clamp(raw_score, 0, 100)

If K = 0:
  engagement_score = 0
```

This naturally produces a 0–100 range since the maximum weight is 100 (`raising_hand`) and all weights are ≤ 100.

**Alternatives Considered**:
- **Sum without normalization**: Would scale with number of detected labels in a tick and be unstable. Rejected.
- **Max-only**: Would lose information about the overall group state. Rejected.
- **Majority-vote single class**: Would discard nuance. Rejected.

---

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---|---|
| TFLite export format | `model_unquant.tflite` + `labels.txt`, 224×224 RGB, softmax output |
| TFLite on Pi 5 ARM64 | `pip install tflite-runtime` (v2.14.0 has cp311/aarch64 wheel) |
| Camera capture | `picamera2` via apt, `capture_array("main")` for numpy RGB frames |
| Firebase service choice | Firestore (not RTDB) — better queries, TTL, structured collections |
| Firebase ARM64 compat | `firebase-admin` is pure Python, ARM64 transitive deps have wheels |
| Local indicator | Terminal ANSI color-coded bar + numeric score, no extra hardware |
| Scoring normalization | Mean of detected behavior weights, clamped [0, 100] |
