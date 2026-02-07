"""Synthetic session data generator — creates realistic engagement history."""

import logging
import math
import random
import uuid
from datetime import datetime, timedelta, timezone

from engagement_monitor.schemas import build_summary_payload, build_tick_payload

logger = logging.getLogger(__name__)


def generate_session(
    device_id: str,
    start_time: datetime,
    duration_minutes: int = 30,
    tick_interval: int = 5,
) -> tuple[list[dict], dict]:
    """Generate a synthetic session with realistic engagement patterns.

    Uses a sine wave + random noise for score variation to create
    natural-looking engagement curves (e.g., attention dips mid-session).

    Args:
        device_id: Device identifier for payloads.
        start_time: UTC start time for the session.
        duration_minutes: Session length in minutes.
        tick_interval: Seconds between ticks.

    Returns:
        Tuple of (tick_payloads, summary_payload).
        - tick_payloads: List of dicts conforming to metric-tick.v1
        - summary_payload: Dict conforming to session-summary.v1
    """
    session_id = str(uuid.uuid4())
    total_ticks = (duration_minutes * 60) // tick_interval

    # Engagement curve parameters
    base_engagement = random.uniform(45, 75)  # baseline score
    amplitude = random.uniform(10, 25)  # wave amplitude
    frequency = random.uniform(0.5, 2.0)  # cycles over session
    noise_scale = random.uniform(3, 8)  # random noise magnitude

    ticks: list[dict] = []
    scores: list[int] = []

    for i in range(total_ticks):
        timestamp = start_time + timedelta(seconds=i * tick_interval)

        # Sine wave + noise for natural engagement curve
        phase = (i / total_ticks) * frequency * 2 * math.pi
        raw_score = base_engagement + amplitude * math.sin(phase) + random.gauss(0, noise_scale)
        score = max(0, min(100, round(raw_score)))

        payload = build_tick_payload(
            device_id=device_id,
            session_id=session_id,
            engagement_score=score,
            timestamp=timestamp,
        )
        ticks.append(payload)
        scores.append(score)

    # Build session summary
    ended_at = start_time + timedelta(minutes=duration_minutes)
    duration_seconds = duration_minutes * 60
    average_engagement = sum(scores) / len(scores) if scores else 0.0

    summary = build_summary_payload(
        device_id=device_id,
        session_id=session_id,
        started_at=start_time,
        ended_at=ended_at,
        duration_seconds=duration_seconds,
        average_engagement=average_engagement,
        tick_count=len(ticks),
        timeline_ref=f"sessions/{session_id}/liveData",
    )

    logger.info(
        "Generated synthetic session %s: %d ticks, avg=%.1f, duration=%dm",
        session_id,
        len(ticks),
        average_engagement,
        duration_minutes,
    )

    return ticks, summary
