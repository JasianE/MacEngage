"""Main tick loop — orchestrates camera, detection, scoring, and emission."""

import logging
import os
import queue
import signal
import sys
import threading
import time
from datetime import datetime, timezone

from engagement_monitor import emitter, indicator
from engagement_monitor.camera import Camera
from engagement_monitor.config import load_config, reload_config
from engagement_monitor.detector import Detector
from engagement_monitor.schemas import build_summary_payload, build_tick_payload
from engagement_monitor.scorer import compute_score
from engagement_monitor.session import SessionManager

logger = logging.getLogger(__name__)


def run_session(
    session_mgr: SessionManager,
    device_id: str,
    config: dict,
    camera: Camera,
    detector: Detector,
    stop_event: threading.Event,
) -> dict:
    """Run a single engagement monitoring session with tick loop.

    Uses SessionManager for lifecycle tracking. Captures frames at the
    configured tick interval, runs inference, computes engagement scores,
    emits tick payloads to Firestore, and updates the terminal indicator.

    The loop runs until ``stop_event`` is set (e.g. by the 'e' command).

    Args:
        session_mgr: SessionManager with an active session.
        device_id: Identifier of this device.
        config: Weight configuration dict.
        camera: Initialized Camera instance.
        detector: Loaded Detector instance.
        stop_event: Threading event — set to signal session end.

    Returns:
        The session summary payload dict.
    """
    session = session_mgr.active_session
    session_id = session.session_id
    tick_interval = config.get("tickIntervalSeconds", 5)
    confidence_threshold = config.get("confidenceThreshold", 0.6)

    # Create session document in Firestore
    emitter.create_session(session_id, device_id, session.started_at.isoformat())

    logger.info("Session %s started on device %s", session_id, device_id)
    print(f"\n[SESSION STARTED] {session_id}")
    print(f"  Device: {device_id} | Tick interval: {tick_interval}s")
    print("  Press 'e' + Enter to end session, 'q' + Enter to quit\n")

    while not stop_event.is_set():
        tick_start = time.monotonic()
        tick_timestamp = datetime.now(timezone.utc)

        # 1. Capture frame
        frame = camera.capture_frame()

        # 2. Detect behaviors
        detections = detector.detect(frame, confidence_threshold)

        # 3. Compute engagement score
        score = compute_score(detections, config)

        # 4. Build tick payload
        payload = build_tick_payload(
            device_id=device_id,
            session_id=session_id,
            engagement_score=score,
            timestamp=tick_timestamp,
        )

        # 5. Emit to Firestore
        time_since_start = int((tick_timestamp - session.started_at).total_seconds())
        emitter.emit_tick(session_id, payload, time_since_start)

        # 6. Record tick in session manager
        session_mgr.record_tick(score)

        # 7. Update terminal indicator
        indicator.show(score)

        # Wait for remaining tick interval, but check stop_event frequently
        elapsed = time.monotonic() - tick_start
        sleep_time = max(0, tick_interval - elapsed)
        if sleep_time > 0:
            stop_event.wait(timeout=sleep_time)

    # End session via SessionManager — computes summary stats
    summary = session_mgr.end_session()

    # Build summary payload
    summary_payload = build_summary_payload(
        device_id=summary.device_id,
        session_id=summary.session_id,
        started_at=summary.started_at,
        ended_at=summary.ended_at,
        duration_seconds=summary.duration_seconds,
        average_engagement=summary.average_engagement,
        tick_count=summary.tick_count,
        timeline_ref=summary.timeline_ref,
    )

    # Write completion to Firestore
    emitter.complete_session(session_id, summary.ended_at.isoformat(), summary_payload)

    print(f"\n\n[SESSION ENDED] {session_id}")
    print(f"  Duration: {summary.duration_seconds}s | Ticks: {summary.tick_count}")
    print(f"  Average Engagement: {summary.average_engagement:.1f}/100")

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

    # Session manager — enforces single-session-at-a-time
    session_mgr = SessionManager()

    # Disabled by default to preserve prior local-keyboard behavior unless explicitly enabled.
    enable_remote_commands = os.environ.get("ENABLE_REMOTE_COMMANDS", "0") == "1"
    enable_stdin_commands = os.environ.get("ENABLE_STDIN_COMMANDS", "1") == "1"

    print("=" * 60)
    print("  Live Group Engagement Monitor")
    print("=" * 60)
    print(f"  Device: {device_id}")
    if enable_stdin_commands:
        print("  Commands: 's' = start session, 'e' = end session, 'q' = quit")
    if enable_remote_commands:
        print("  Remote commands enabled: devices/{deviceId}/commands")
    print("=" * 60)

    session_thread: threading.Thread | None = None
    stop_event = threading.Event()
    shutdown_event = threading.Event()
    cmd_queue: queue.Queue[str] = queue.Queue()

    def _start_session() -> None:
        nonlocal session_thread, config
        if session_thread is not None and session_thread.is_alive():
            print("[WARN] Session already active. Press 'e' to end it first.")
            return

        # Reload config for each new session (T021)
        config, errors = reload_config()
        if errors:
            print(f"[WARN] Config errors (using defaults): {errors[0]}")
        else:
            logger.info("Config reloaded for new session")

        # Start session via manager (enforces no overlap)
        try:
            session_mgr.start_session(device_id)
        except RuntimeError as exc:
            print(f"[ERROR] {exc}")
            return

        stop_event.clear()
        session_thread = threading.Thread(
            target=run_session,
            args=(session_mgr, device_id, config, camera, detector, stop_event),
            daemon=True,
        )
        session_thread.start()

    def _end_session() -> None:
        nonlocal session_thread
        if session_thread is None or not session_thread.is_alive():
            print("[WARN] No active session to end.")
            return
        stop_event.set()
        session_thread.join(timeout=10)
        session_thread = None

    def _stdin_reader() -> None:
        while not shutdown_event.is_set():
            try:
                cmd = input("\n> ").strip().lower()
            except EOFError:
                cmd = "q"
            cmd_queue.put(cmd)
            if cmd == "q":
                return

    def _signal_handler(signum, frame):
        """Handle SIGINT/SIGTERM for graceful shutdown."""
        sig_name = signal.Signals(signum).name
        logger.info("Received %s — initiating graceful shutdown", sig_name)
        shutdown_event.set()
        if session_thread is not None and session_thread.is_alive():
            stop_event.set()

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    if enable_stdin_commands:
        threading.Thread(target=_stdin_reader, daemon=True).start()

    try:
        while not shutdown_event.is_set():
            if enable_remote_commands:
                pending = emitter.fetch_pending_command(device_id)
                if pending is not None:
                    cmd_id, cmd_doc = pending
                    cmd_type = str(cmd_doc.get("type", "")).strip().lower()
                    if cmd_type in {"start", "start_session"}:
                        _start_session()
                        emitter.mark_command(device_id, cmd_id, "processed")
                    elif cmd_type in {"end", "stop", "end_session"}:
                        _end_session()
                        emitter.mark_command(device_id, cmd_id, "processed")
                    elif cmd_type in {"shutdown", "quit"}:
                        emitter.mark_command(device_id, cmd_id, "processed")
                        cmd_queue.put("q")
                    else:
                        emitter.mark_command(
                            device_id,
                            cmd_id,
                            "rejected",
                            f"Unknown command type: {cmd_type}",
                        )

            try:
                cmd = cmd_queue.get(timeout=0.5)
            except queue.Empty:
                continue

            if cmd == "s":
                _start_session()

            elif cmd == "e":
                _end_session()

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
        # Ensure active session ends cleanly on any exit path
        if session_thread is not None and session_thread.is_alive():
            logger.info("Cleaning up active session on shutdown")
            stop_event.set()
            session_thread.join(timeout=10)
        camera.stop()
        emitter.close()
        logger.info("Shutdown complete")
        print("[INFO] Goodbye.")
        sys.exit(0)
