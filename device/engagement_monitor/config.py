"""Configuration loader and validator for behavior weights."""

import json
import logging
import os
from pathlib import Path

import jsonschema

logger = logging.getLogger(__name__)

# Hardcoded defaults — used when config file is missing or invalid
DEFAULT_CONFIG = {
    "raising_hand": 100,
    "writing_notes": 80,
    "looking_at_board": 75,
    "on_phone": 0,
    "head_down": 0,
    "talking_to_group": 15,
    "hands_on_head": 30,
    "looking_away_long": 20,
    "confidenceThreshold": 0.6,
    "tickIntervalSeconds": 0.5,
}

BEHAVIOR_KEYS = [
    "raising_hand",
    "writing_notes",
    "looking_at_board",
    "on_phone",
    "head_down",
    "talking_to_group",
    "hands_on_head",
    "looking_away_long",
]

_SCHEMA_PATH = Path(__file__).resolve().parent.parent / "schemas" / "weight-config.v1.schema.json"
_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "weights.json"

# Last known-good config kept in memory so invalid reloads can safely fall back
# to the previous valid values (rather than always resetting to defaults).
_LAST_VALID_CONFIG: dict = dict(DEFAULT_CONFIG)


def _load_schema() -> dict:
    """Load the weight-config JSON schema."""
    with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _validate(config: dict, schema: dict) -> list[str]:
    """Validate config against schema. Returns list of error messages."""
    validator = jsonschema.Draft7Validator(schema)
    errors = []
    for error in sorted(validator.iter_errors(config), key=lambda e: list(e.path)):
        path = ".".join(str(p) for p in error.path) or "(root)"
        errors.append(f"{path}: {error.message}")
    return errors


def load_config(config_path: str | Path | None = None) -> dict:
    """Load and validate weights config from JSON file.

    Falls back to hardcoded defaults if file is missing or invalid.

    Args:
        config_path: Path to weights.json. Defaults to device/config/weights.json.

    Returns:
        Validated configuration dictionary.
    """
    path = Path(config_path) if config_path else _CONFIG_PATH
    schema = _load_schema()

    global _LAST_VALID_CONFIG

    if not path.exists():
        logger.warning("Config file not found at %s — using defaults", path)
        _LAST_VALID_CONFIG = dict(DEFAULT_CONFIG)
        return dict(_LAST_VALID_CONFIG)

    try:
        with open(path, "r", encoding="utf-8") as f:
            config = json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to read config file %s: %s — using defaults", path, exc)
        _LAST_VALID_CONFIG = dict(DEFAULT_CONFIG)
        return dict(_LAST_VALID_CONFIG)

    errors = _validate(config, schema)
    if errors:
        for err in errors:
            logger.error("Config validation error — %s", err)
        logger.warning("Invalid config rejected — using defaults")
        _LAST_VALID_CONFIG = dict(DEFAULT_CONFIG)
        return dict(_LAST_VALID_CONFIG)

    logger.info("Config loaded from %s", path)
    _LAST_VALID_CONFIG = dict(config)
    return config


def reload_config(config_path: str | Path | None = None) -> tuple[dict, list[str]]:
    """Re-read config from disk, validate, and return (config, errors).

    If invalid, returns the previous default config and the list of errors.

    Args:
        config_path: Path to weights.json. Defaults to device/config/weights.json.

    Returns:
        Tuple of (config_dict, error_list). error_list is empty on success.
    """
    path = Path(config_path) if config_path else _CONFIG_PATH
    schema = _load_schema()

    global _LAST_VALID_CONFIG

    if not path.exists():
        msg = f"Config file not found: {path}"
        logger.warning("%s — using previous valid config", msg)
        return dict(_LAST_VALID_CONFIG), [msg]

    try:
        with open(path, "r", encoding="utf-8") as f:
            config = json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        msg = f"Failed to read config: {exc}"
        logger.error(msg)
        return dict(_LAST_VALID_CONFIG), [msg]

    errors = _validate(config, schema)
    if errors:
        for err in errors:
            logger.error("Config validation error — %s", err)
        return dict(_LAST_VALID_CONFIG), errors

    logger.info("Config reloaded from %s", path)
    _LAST_VALID_CONFIG = dict(config)
    return config, []
