"""Firestore payload emission — writes ticks, sessions, and summaries."""

import logging
import os
from pathlib import Path
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)

_app = None
_db = None


def _ensure_initialized():
    """Initialize Firebase app and Firestore client if not already done."""
    global _app, _db
    if _db is not None:
        return

    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        # Convenience default for local device runs:
        # use device/config/service-account-key.json if present.
        default_key = Path(__file__).resolve().parents[1] / "config" / "service-account-key.json"
        if default_key.exists():
            cred_path = str(default_key)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path
            logger.info("Using default Firebase key at %s", cred_path)

    if cred_path:
        cred = credentials.Certificate(cred_path)
    else:
        # Fall back to Application Default Credentials
        cred = credentials.ApplicationDefault()

    _app = firebase_admin.initialize_app(cred)
    _db = firestore.client()
    logger.info("Firebase initialized")


def get_db():
    """Return the Firestore client, initializing if needed."""
    _ensure_initialized()
    return _db


def create_session(session_id: str, device_id: str, started_at: str, title: str | None = None) -> None:
    """Create a session document in Firestore on session start.

    Firebase model (canonical):
    sessions/{sessionId} => {title, overallScore, comments}

    Args:
        session_id: Session UUID.
        device_id: Device identifier (used for default title text only).
        started_at: ISO 8601 UTC timestamp string (used for default title text only).
        title: Optional session title override.
    """
    db = get_db()
    db.collection("sessions").document(session_id).set({
        "title": title or f"Session {session_id[:8]} ({device_id}) {started_at[:19]}",
        "overallScore": 0,
        "comments": [],
    })
    logger.debug("Session created: sessions/%s (device=%s)", session_id, device_id)


def complete_session(session_id: str, ended_at: str, summary: dict) -> None:
    """Update a session document on session end.

    Sets overallScore from summary.averageEngagement.

    Args:
        session_id: Session UUID.
        ended_at: ISO 8601 UTC timestamp string (unused, kept for compatibility).
        summary: Dict conforming to session-summary.v1 schema.
    """
    _ = ended_at
    db = get_db()
    db.collection("sessions").document(session_id).update({
        "overallScore": float(summary.get("averageEngagement", 0)),
    })
    logger.debug("Session completed: sessions/%s", session_id)


def emit_tick(session_id: str, payload: dict, time_since_start: int) -> str:
    """Write a metric tick document to Firestore.

    Args:
        session_id: Active session UUID.
        payload: Dict conforming to metric-tick.v1 schema (engagementScore is used).
        time_since_start: Seconds elapsed since session start.

    Returns:
        The auto-generated document ID.
    """
    db = get_db()
    live_data = {
        "timeSinceStart": int(time_since_start),
        "engagementScore": int(payload["engagementScore"]),
    }
    doc_ref = db.collection("sessions").document(session_id).collection("liveData").add(live_data)
    doc_id = doc_ref[1].id
    # logger.info("Tick emitted: sessions/%s/liveData/%s", session_id, doc_id)
    return doc_id


def emit_session(session_id: str, session_data: dict) -> None:
    """Write or update a session document in Firestore.

    Args:
        session_id: Session UUID.
        session_data: Session metadata dict.
    """
    db = get_db()
    db.collection("sessions").document(session_id).set(session_data, merge=True)
    logger.debug("Session document written: sessions/%s", session_id)


def emit_summary(session_id: str, summary: dict) -> None:
    """Update the session document with the session summary.

    Args:
        session_id: Session UUID.
        summary: Dict conforming to session-summary.v1 schema.
    """
    db = get_db()
    db.collection("sessions").document(session_id).update({
        "overallScore": float(summary.get("averageEngagement", 0)),
    })
    logger.debug("Session summary written: sessions/%s", session_id)


def fetch_pending_command(device_id: str) -> tuple[str, dict] | None:
    """Fetch the oldest pending remote command for a device.

    Command documents are expected at:
      devices/{deviceId}/commands/{commandId}

    Returns:
        Tuple of (command_id, command_dict) or None if no pending command.
    """
    db = get_db()
    cmd_ref = (
        db.collection("devices")
        .document(device_id)
        .collection("commands")
        .where("status", "==", "pending")
        .limit(1)
    )
    docs = list(cmd_ref.stream())
    if not docs:
        return None
    doc = docs[0]
    return doc.id, (doc.to_dict() or {})


def mark_command(device_id: str, command_id: str, status: str, message: str | None = None) -> None:
    """Mark a remote command as processed/rejected/error."""
    db = get_db()
    update_data = {
        "status": status,
        "processedAt": firestore.SERVER_TIMESTAMP,
    }
    if message:
        update_data["message"] = message

    (
        db.collection("devices")
        .document(device_id)
        .collection("commands")
        .document(command_id)
        .set(update_data, merge=True)
    )


def close():
    """Clean up Firebase resources."""
    global _app, _db
    if _app is not None:
        firebase_admin.delete_app(_app)
        _app = None
        _db = None
        logger.info("Firebase connection closed")
