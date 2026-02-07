"""Synthetic session data generator — creates realistic engagement history."""

import logging
import math
import random
import uuid
from datetime import datetime, timedelta, timezone

from engagement_monitor import SCHEMA_VERSION
from engagement_monitor.config import BEHAVIOR_KEYS, DEFAULT_CONFIG
from engagement_monitor.schemas import build_summary_payload, build_tick_payload

logger = logging.getLogger(__name__)

# Behavior distribution templates for realistic variation
_POSITIVE_BEHAVIORS = ["raising_hand", "writing_notes", "looking_at_board"]
_NEGATIVE_BEHAVIORS = ["on_phone", "head_down", "talking_to_group", "hands_on_head", "looking_away_long"]


def _distribute_behaviors(people: int, engagement_bias: float) -> dict:
    """Distribute people across behavior categories with engagement bias.

    Higher engagement_bias (0–1) means more people in positive behaviors.

    Args:
        people: Total number of people to distribute.
        engagement_bias: 0.0 = all negative, 1.0 = all positive.

    Returns:
        BehaviorsSummary dict with counts summing to people.
    """
    summary = {k: 0 for k in BEHAVIOR_KEYS}
    if people == 0:
        return summary

    for _ in range(people):
        if random.random() < engagement_bias:
            behavior = random.choice(_POSITIVE_BEHAVIORS)
        else:
            behavior = random.choice(_NEGATIVE_BEHAVIORS)
        summary[behavior] += 1

    return summary


def generate_session(
    device_id: str,
    start_time: datetime,
    duration_minutes: int = 30,
    tick_interval: int = 5,
    people_range: tuple[int, int] = (8, 25),
) -> tuple[list[dict], dict]:
    """Generate a synthetic session with realistic engagement patterns.

    Uses a sine wave + random noise for score variation to create
    natural-looking engagement curves (e.g., attention dips mid-session).

    Args:
        device_id: Device identifier for payloads.
        start_time: UTC start time for the session.
        duration_minutes: Session length in minutes.
        tick_interval: Seconds between ticks.
        people_range: (min, max) people detected per tick.

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

        # People count varies slightly per tick
        people = random.randint(*people_range)

        # Distribute behaviors based on engagement level
        engagement_bias = score / 100.0
        behaviors = _distribute_behaviors(people, engagement_bias)

        payload = build_tick_payload(
            device_id=device_id,
            session_id=session_id,
            engagement_score=score,
            behaviors_summary=behaviors,
            people_detected=people,
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
        timeline_ref=f"sessions/{session_id}/ticks",
    )

    logger.info(
        "Generated synthetic session %s: %d ticks, avg=%.1f, duration=%dm",
        session_id,
        len(ticks),
        average_engagement,
        duration_minutes,
    )

    return ticks, summary
