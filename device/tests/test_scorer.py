from engagement_monitor.config import DEFAULT_CONFIG
from engagement_monitor.scorer import compute_score


def test_compute_score_empty_detections_returns_zeroes():
    score = compute_score([], DEFAULT_CONFIG)
    assert score == 0


def test_compute_score_weighted_mean_and_clamp():
    detections = [
        ("raising_hand", 0.9),
        ("writing_notes", 0.8),
        ("on_phone", 0.7),
    ]
    score = compute_score(detections, DEFAULT_CONFIG)

    # (100 + 80 + 0) / 3 = 60
    assert score == 60


def test_compute_score_clamps_upper_bound():
    weights = dict(DEFAULT_CONFIG)
    weights["raising_hand"] = 500
    score = compute_score([("raising_hand", 0.99)], weights)
    assert score == 100


def test_compute_score_with_confidence_toggle_disabled_matches_legacy_behavior():
    weights = dict(DEFAULT_CONFIG)
    weights["useConfidenceInScoring"] = False
    weights["confidenceImpactStrength"] = 1.0

    detections = [
        ("raising_hand", 0.60),
        ("writing_notes", 0.60),
    ]
    score = compute_score(detections, weights)

    # Legacy mean: (100 + 80) / 2 = 90
    assert score == 90


def test_compute_score_confidence_strength_zero_has_no_effect():
    weights = dict(DEFAULT_CONFIG)
    weights["useConfidenceInScoring"] = True
    weights["confidenceImpactStrength"] = 0.0

    detections = [
        ("raising_hand", 0.60),
        ("writing_notes", 0.60),
    ]
    score = compute_score(detections, weights)

    assert score == 90


def test_compute_score_confidence_strength_one_fully_applies_average_confidence():
    weights = dict(DEFAULT_CONFIG)
    weights["useConfidenceInScoring"] = True
    weights["confidenceImpactStrength"] = 1.0

    detections = [
        ("raising_hand", 0.60),
        ("writing_notes", 0.80),
    ]
    score = compute_score(detections, weights)

    # base = (100 + 80) / 2 = 90
    # avg_conf = (0.6 + 0.8) / 2 = 0.7
    # final = 90 * 0.7 = 63
    assert score == 63


def test_compute_score_confidence_strength_partial_blend():
    weights = dict(DEFAULT_CONFIG)
    weights["useConfidenceInScoring"] = True
    weights["confidenceImpactStrength"] = 0.5

    detections = [
        ("raising_hand", 0.60),
        ("writing_notes", 0.80),
    ]
    score = compute_score(detections, weights)

    # base = 90, avg_conf = 0.7
    # modifier = (1 - 0.5) + (0.5 * 0.7) = 0.85
    # final = 76.5 -> 76 (banker's rounding)
    assert score == 76
