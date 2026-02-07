"""Firestore payload emission — writes ticks, sessions, and summaries."""

import logging
import os
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


def create_session(session_id: str, device_id: str, started_at: str) -> None:
    """Create a session document in Firestore on session start.

    Writes the initial session document with status 'active' and endedAt null.

    Args:
        session_id: Session UUID.
        device_id: Device identifier.
        started_at: ISO 8601 UTC timestamp string.
    """
    db = get_db()
    db.collection("sessions").document(session_id).set({
        "deviceId": device_id,
        "startedAt": started_at,
        "status": "active",
        "endedAt": None,
    })
    logger.info("Session created: sessions/%s (device=%s)", session_id, device_id)


def complete_session(session_id: str, ended_at: str, summary: dict) -> None:
    """Update a session document on session end.

    Sets endedAt, status to 'completed', and embeds the summary.

    Args:
        session_id: Session UUID.
        ended_at: ISO 8601 UTC timestamp string.
        summary: Dict conforming to session-summary.v1 schema.
    """
    db = get_db()
    db.collection("sessions").document(session_id).update({
        "endedAt": ended_at,
        "status": "completed",
        "summary": summary,
    })
    logger.info("Session completed: sessions/%s", session_id)


def emit_tick(session_id: str, payload: dict) -> str:
    """Write a metric tick document to Firestore.

    Args:
        session_id: Active session UUID.
        payload: Dict conforming to metric-tick.v1 schema.

    Returns:
        The auto-generated document ID.
    """
    db = get_db()
    doc_ref = db.collection("sessions").document(session_id).collection("ticks").add(payload)
    doc_id = doc_ref[1].id
    logger.info("Tick emitted: sessions/%s/ticks/%s", session_id, doc_id)
    return doc_id


def emit_session(session_id: str, session_data: dict) -> None:
    """Write or update a session document in Firestore.

    Args:
        session_id: Session UUID.
        session_data: Session metadata dict.
    """
    db = get_db()
    db.collection("sessions").document(session_id).set(session_data, merge=True)
    logger.info("Session document written: sessions/%s", session_id)


def emit_summary(session_id: str, summary: dict) -> None:
    """Update the session document with the session summary.

    Args:
        session_id: Session UUID.
        summary: Dict conforming to session-summary.v1 schema.
    """
    db = get_db()
    db.collection("sessions").document(session_id).update({
        "summary": summary,
        "status": "completed",
        "endedAt": summary.get("endedAt"),
    })
    logger.info("Session summary written: sessions/%s", session_id)


def close():
    """Clean up Firebase resources."""
    global _app, _db
    if _app is not None:
        firebase_admin.delete_app(_app)
        _app = None
        _db = None
        logger.info("Firebase connection closed")
