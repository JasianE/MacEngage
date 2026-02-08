import json
from pathlib import Path

from engagement_monitor.config import DEFAULT_CONFIG, load_config, reload_config


def test_load_config_returns_defaults_when_missing_file(tmp_path: Path):
    missing = tmp_path / "missing.json"
    cfg = load_config(missing)
    assert cfg == DEFAULT_CONFIG


def test_reload_config_returns_previous_valid_config_on_invalid(tmp_path: Path):
    weights = tmp_path / "weights.json"

    valid = dict(DEFAULT_CONFIG)
    valid["writing_notes"] = 50
    weights.write_text(json.dumps(valid), encoding="utf-8")

    cfg, errors = reload_config(weights)
    assert errors == []
    assert cfg["writing_notes"] == 50

    invalid = dict(valid)
    invalid.pop("raising_hand")
    weights.write_text(json.dumps(invalid), encoding="utf-8")

    cfg2, errors2 = reload_config(weights)
    assert errors2
    assert cfg2["writing_notes"] == 50


def test_load_config_accepts_legacy_config_without_confidence_scoring_keys(tmp_path: Path):
    weights = tmp_path / "weights.json"
    legacy = dict(DEFAULT_CONFIG)
    legacy.pop("useConfidenceInScoring")
    legacy.pop("confidenceImpactStrength")
    weights.write_text(json.dumps(legacy), encoding="utf-8")

    cfg = load_config(weights)

    # Legacy config should remain valid and load successfully.
    assert cfg["raising_hand"] == DEFAULT_CONFIG["raising_hand"]
    assert "useConfidenceInScoring" not in cfg
    assert "confidenceImpactStrength" not in cfg
