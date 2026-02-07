"""Payload construction for metric ticks and session summaries."""

from datetime import datetime, timezone

from engagement_monitor import SCHEMA_VERSION


def build_tick_payload(
    device_id: str,
    session_id: str,
    engagement_score: int,
    timestamp: datetime | None = None,
) -> dict:
    """Construct a metric-tick payload conforming to metric-tick.v1 schema.

    Args:
        device_id: Device identifier.
        session_id: Active session UUID.
        engagement_score: Clamped [0, 100] engagement score.
        timestamp: UTC timestamp. Defaults to now.

    Returns:
        Dict conforming to metric-tick.v1.schema.json.
    """
    ts = timestamp or datetime.now(timezone.utc)
    return {
        "schemaVersion": SCHEMA_VERSION,
        "deviceId": device_id,
        "sessionId": session_id,
        "timestamp": ts.isoformat(),
        "engagementScore": engagement_score,
    }


def build_summary_payload(
    device_id: str,
    session_id: str,
    started_at: datetime,
    ended_at: datetime,
    duration_seconds: int,
    average_engagement: float,
    tick_count: int,
    timeline_ref: str,
) -> dict:
    """Construct a session-summary payload conforming to session-summary.v1 schema.

    Args:
        device_id: Device identifier.
        session_id: Session UUID.
        started_at: Session start time (UTC).
        ended_at: Session end time (UTC).
        duration_seconds: Total session duration in seconds.
        average_engagement: Mean engagement score across all ticks.
        tick_count: Number of ticks emitted during session.
        timeline_ref: Firestore collection path to tick data.

    Returns:
        Dict conforming to session-summary.v1.schema.json.
    """
    return {
        "schemaVersion": SCHEMA_VERSION,
        "deviceId": device_id,
        "sessionId": session_id,
        "startedAt": started_at.isoformat(),
        "endedAt": ended_at.isoformat(),
        "durationSeconds": duration_seconds,
        "averageEngagement": round(average_engagement, 2),
        "tickCount": tick_count,
        "timelineRef": timeline_ref,
    }
