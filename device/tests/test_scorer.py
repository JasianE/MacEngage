from engagement_monitor.config import DEFAULT_CONFIG
from engagement_monitor.scorer import compute_score


def test_compute_score_empty_detections_returns_zeroes():
    score, summary, people = compute_score([], DEFAULT_CONFIG)
    assert score == 0
    assert people == 0
    assert all(v == 0 for v in summary.values())


def test_compute_score_weighted_mean_and_clamp():
    detections = [
        ("raising_hand", 0.9),
        ("writing_notes", 0.8),
        ("on_phone", 0.7),
    ]
    score, summary, people = compute_score(detections, DEFAULT_CONFIG)

    # (100 + 80 + 0) / 3 = 60
    assert score == 60
    assert people == 3
    assert summary["raising_hand"] == 1
    assert summary["writing_notes"] == 1
    assert summary["on_phone"] == 1


def test_compute_score_clamps_upper_bound():
    weights = dict(DEFAULT_CONFIG)
    weights["raising_hand"] = 500
    score, _, _ = compute_score([("raising_hand", 0.99)], weights)
    assert score == 100
