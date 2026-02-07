import json
from datetime import datetime, timezone
from pathlib import Path

import jsonschema

from engagement_monitor.schemas import build_summary_payload, build_tick_payload
from synthetic.generator import generate_session


def _load_schema(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def test_tick_and_summary_payloads_conform_to_schema():
    metric_schema = _load_schema("schemas/metric-tick.v1.schema.json")
    summary_schema = _load_schema("schemas/session-summary.v1.schema.json")

    sid = "123e4567-e89b-12d3-a456-426614174000"
    now = datetime.now(timezone.utc)

    tick = build_tick_payload("dev-1", sid, 85, now)
    summary = build_summary_payload(
        "dev-1",
        sid,
        now,
        now,
        1,
        85.0,
        1,
        f"sessions/{sid}/ticks",
    )

    jsonschema.validate(tick, metric_schema)
    jsonschema.validate(summary, summary_schema)


def test_synthetic_generator_outputs_schema_valid_payloads():
    metric_schema = _load_schema("schemas/metric-tick.v1.schema.json")
    summary_schema = _load_schema("schemas/session-summary.v1.schema.json")

    ticks, summary = generate_session(
        device_id="dev-1",
        start_time=datetime.now(timezone.utc),
        duration_minutes=1,
        tick_interval=5,
    )

    assert len(ticks) > 0
    assert summary["tickCount"] == len(ticks)

    for tick in ticks:
        jsonschema.validate(tick, metric_schema)
    jsonschema.validate(summary, summary_schema)
