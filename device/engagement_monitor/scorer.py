"""Engagement scoring — converts behavior detections into a weighted score."""

import logging

from engagement_monitor.config import BEHAVIOR_KEYS

logger = logging.getLogger(__name__)


def _empty_behaviors_summary() -> dict:
    """Return a BehaviorsSummary dict with all counts at zero."""
    return {key: 0 for key in BEHAVIOR_KEYS}


def compute_score(
    detections: list[tuple[str, float]], weights: dict
) -> tuple[int, dict, int]:
    """Compute engagement score from behavior detections and weight config.

    For N people detected (each classified into exactly one behavior):
        raw_score = (1/N) * sum(weight(behavior_i)) for i in 1..N
        engagement_score = clamp(raw_score, 0, 100)

    If no detections, returns score 0 with all-zero summary.

    Args:
        detections: List of (behavior_label, confidence) tuples from detector.
        weights: Weight configuration dict with behavior keys mapped to ints.

    Returns:
        Tuple of (engagement_score, behaviors_summary, people_detected).
        - engagement_score: int in [0, 100]
        - behaviors_summary: dict with counts per behavior
        - people_detected: total number of people detected
    """
    summary = _empty_behaviors_summary()

    if not detections:
        logger.debug("No detections — score = 0, people = 0")
        return 0, summary, 0

    # Count each detected behavior
    for label, _confidence in detections:
        if label in summary:
            summary[label] += 1
        else:
            logger.warning("Unknown behavior label '%s' — skipping", label)

    people_detected = sum(summary.values())

    if people_detected == 0:
        return 0, summary, 0

    # Compute weighted mean score
    total_weight = 0
    for behavior, count in summary.items():
        behavior_weight = weights.get(behavior, 0)
        total_weight += behavior_weight * count

    raw_score = total_weight / people_detected
    engagement_score = max(0, min(100, round(raw_score)))

    logger.debug(
        "Score: %d (raw=%.2f, people=%d, behaviors=%s)",
        engagement_score,
        raw_score,
        people_detected,
        summary,
    )
    return engagement_score, summary, people_detected
