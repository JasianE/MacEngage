"""Main tick loop — orchestrates camera, detection, scoring, and emission."""

import logging
import threading
import time
import uuid
from datetime import datetime, timezone

from engagement_monitor import emitter, indicator
from engagement_monitor.camera import Camera
from engagement_monitor.config import load_config
from engagement_monitor.detector import Detector
from engagement_monitor.schemas import build_summary_payload, build_tick_payload
from engagement_monitor.scorer import compute_score

logger = logging.getLogger(__name__)


def run_session(
    session_id: str,
    device_id: str,
    config: dict,
    camera: Camera,
    detector: Detector,
    stop_event: threading.Event,
) -> dict:
    """Run a single engagement monitoring session with tick loop.

    Captures frames at the configured tick interval, runs inference,
    computes engagement scores, emits tick payloads to Firestore,
    and updates the terminal indicator.

    The loop runs until ``stop_event`` is set (e.g. by the 'e' command).

    Args:
        session_id: UUID for this session.
        device_id: Identifier of this device.
        config: Weight configuration dict.
        camera: Initialized Camera instance.
        detector: Loaded Detector instance.
        stop_event: Threading event — set to signal session end.

    Returns:
        The session summary payload dict.
    """
    tick_interval = config.get("tickIntervalSeconds", 5)
    confidence_threshold = config.get("confidenceThreshold", 0.6)

    started_at = datetime.now(timezone.utc)
    scores: list[int] = []
    tick_count = 0

    # Create session document in Firestore
    emitter.emit_session(session_id, {
        "deviceId": device_id,
        "startedAt": started_at.isoformat(),
        "status": "active",
        "endedAt": None,
    })

    logger.info("Session %s started on device %s", session_id, device_id)
    print(f"\n[SESSION STARTED] {session_id}")
    print(f"  Device: {device_id} | Tick interval: {tick_interval}s")
    print("  Press 'e' + Enter to end session, 'q' + Enter to quit\n")

    while not stop_event.is_set():
        tick_start = time.monotonic()

        # 1. Capture frame
        frame = camera.capture_frame()

        # 2. Detect behaviors
        detections = detector.detect(frame, confidence_threshold)

        # 3. Compute engagement score
        score, behaviors_summary, people_detected = compute_score(detections, config)

        # 4. Build tick payload
        payload = build_tick_payload(
            device_id=device_id,
            session_id=session_id,
            engagement_score=score,
            behaviors_summary=behaviors_summary,
            people_detected=people_detected,
        )

        # 5. Emit to Firestore
        emitter.emit_tick(session_id, payload)
        tick_count += 1
        scores.append(score)

        # 6. Update terminal indicator
        indicator.show(score)

        # Wait for remaining tick interval, but check stop_event frequently
        elapsed = time.monotonic() - tick_start
        sleep_time = max(0, tick_interval - elapsed)
        if sleep_time > 0:
            # Use stop_event.wait() so we can be interrupted promptly
            stop_event.wait(timeout=sleep_time)

    # Compute and emit session summary
    ended_at = datetime.now(timezone.utc)
    duration_seconds = max(1, int((ended_at - started_at).total_seconds()))
    average_engagement = sum(scores) / len(scores) if scores else 0.0

    summary_payload = build_summary_payload(
        device_id=device_id,
        session_id=session_id,
        started_at=started_at,
        ended_at=ended_at,
        duration_seconds=duration_seconds,
        average_engagement=average_engagement,
        tick_count=tick_count,
        timeline_ref=f"sessions/{session_id}/ticks",
    )

    emitter.emit_summary(session_id, summary_payload)

    print(f"\n\n[SESSION ENDED] {session_id}")
    print(f"  Duration: {duration_seconds}s | Ticks: {tick_count}")
    print(f"  Average Engagement: {average_engagement:.1f}/100")

    return summary_payload


def main(device_id: str) -> None:
    """Main application loop — handles session start/end via keyboard input.

    Args:
        device_id: Identifier of this device.
    """
    # Load configuration
    config = load_config()
    logger.info("Config loaded: %s", {k: v for k, v in config.items()})

    # Initialize camera
    camera = Camera()
    camera.start()

    # Load detector
    detector = Detector()
    detector.load()

    print("=" * 60)
    print("  Live Group Engagement Monitor")
    print("=" * 60)
    print(f"  Device: {device_id}")
    print("  Commands: 's' = start session, 'q' = quit")
    print("=" * 60)

    session_thread: threading.Thread | None = None
    stop_event = threading.Event()

    try:
        while True:
            try:
                cmd = input("\n> ").strip().lower()
            except EOFError:
                break

            if cmd == "s":
                if session_thread is not None and session_thread.is_alive():
                    print("[WARN] Session already active. Press 'e' to end it first.")
                    continue

                # Reload config for each new session
                config = load_config()
                stop_event.clear()
                session_id = str(uuid.uuid4())

                session_thread = threading.Thread(
                    target=run_session,
                    args=(session_id, device_id, config, camera, detector, stop_event),
                    daemon=True,
                )
                session_thread.start()

            elif cmd == "e":
                if session_thread is None or not session_thread.is_alive():
                    print("[WARN] No active session to end.")
                    continue
                stop_event.set()
                session_thread.join(timeout=10)
                session_thread = None

            elif cmd == "q":
                if session_thread is not None and session_thread.is_alive():
                    print("[INFO] Ending active session before quitting...")
                    stop_event.set()
                    session_thread.join(timeout=10)
                print("[INFO] Shutting down...")
                break

            else:
                print("  Commands: 's' = start, 'e' = end, 'q' = quit")

    except KeyboardInterrupt:
        print("\n[INFO] Interrupted — shutting down...")
        if session_thread is not None and session_thread.is_alive():
            stop_event.set()
            session_thread.join(timeout=10)

    finally:
        camera.stop()
        emitter.close()
        print("[INFO] Goodbye.")
