"""Engagement scoring — converts behavior detections into a weighted score."""

import logging

logger = logging.getLogger(__name__)


def compute_score(detections: list[tuple[str, float]], weights: dict) -> int:
    """Compute a group engagement score from model detections.

    For demo mode, scoring is score-only (no people counts, no behavior summary).
    The score is the average of configured behavior weights for all detected
    labels in the current tick, clamped to [0, 100].

    If no known detections are present, returns 0.

    Args:
        detections: List of (behavior_label, confidence) tuples from detector.
        weights: Weight configuration dict with behavior keys mapped to ints.

    Returns:
        engagement_score: int in [0, 100]
    """
    if not detections:
        logger.debug("No detections — score = 0")
        return 0

    label_weights: list[int] = []
    confidences: list[float] = []
    for label, confidence in detections:
        if label in weights:
            label_weights.append(int(weights.get(label, 0)))
            confidences.append(float(confidence))
        else:
            logger.warning("Unknown behavior label '%s' — skipping", label)

    if not label_weights:
        logger.debug("No known detections after filtering — score = 0")
        return 0

    raw_score = sum(label_weights) / len(label_weights)

    use_confidence = bool(weights.get("useConfidenceInScoring", False))
    if use_confidence and confidences:
        strength = float(weights.get("confidenceImpactStrength", 0.35))
        strength = max(0.0, min(1.0, strength))
        avg_confidence = sum(confidences) / len(confidences)
        confidence_modifier = (1.0 - strength) + (strength * avg_confidence)
        raw_score *= confidence_modifier
        logger.debug(
            "Confidence-adjusted score (modifier=%.3f, avg_conf=%.3f, strength=%.2f)",
            confidence_modifier,
            avg_confidence,
            strength,
        )

    engagement_score = max(0, min(100, round(raw_score)))

    logger.debug(
        "Score: %d (raw=%.2f, labels=%d)",
        engagement_score,
        raw_score,
        len(label_weights),
    )
    return engagement_score
