import json
import threading
from pathlib import Path

import jsonschema

from engagement_monitor.config import DEFAULT_CONFIG
from engagement_monitor.main import run_session
from engagement_monitor.session import SessionManager


def _load_schema(path: str) -> dict:
    base = Path(__file__).resolve().parent.parent
    return json.loads((base / path).read_text(encoding="utf-8"))


class _FakeCamera:
    def capture_frame(self):
        return b"fake-frame"


class _FakeDetector:
    def __init__(self, detections_per_tick, stop_event: threading.Event):
        self._detections_per_tick = detections_per_tick
        self._stop_event = stop_event
        self._idx = 0

    def detect(self, _frame, _confidence_threshold):
        detections = self._detections_per_tick[self._idx]
        self._idx += 1
        if self._idx >= len(self._detections_per_tick):
            self._stop_event.set()
        return detections


def test_run_session_with_simulated_model_output(monkeypatch):
    metric_schema = _load_schema("schemas/metric-tick.v1.schema.json")
    summary_schema = _load_schema("schemas/session-summary.v1.schema.json")

    stop_event = threading.Event()
    detections_per_tick = [
        [("raising_hand", 0.90)],  # 100
        [("writing_notes", 0.80), ("on_phone", 0.95)],  # (80 + 0) / 2 = 40
        [],  # 0
    ]

    emitted_ticks: list[dict] = []
    created_sessions: list[dict] = []
    completed_sessions: list[dict] = []
    shown_scores: list[int] = []

    def _fake_create_session(
        session_id: str,
        device_id: str,
        started_at: str,
        title: str | None = None,
    ):
        created_sessions.append(
            {
                "session_id": session_id,
                "device_id": device_id,
                "started_at": started_at,
                "title": title,
            }
        )

    def _fake_emit_tick(_session_id: str, payload: dict, _time_since_start: int):
        emitted_ticks.append(payload)
        return f"tick-{len(emitted_ticks)}"

    def _fake_complete_session(session_id: str, ended_at: str, summary: dict):
        completed_sessions.append(
            {"session_id": session_id, "ended_at": ended_at, "summary": summary}
        )

    monkeypatch.setattr("engagement_monitor.emitter.create_session", _fake_create_session)
    monkeypatch.setattr("engagement_monitor.emitter.emit_tick", _fake_emit_tick)
    monkeypatch.setattr("engagement_monitor.emitter.complete_session", _fake_complete_session)
    monkeypatch.setattr("engagement_monitor.indicator.show", lambda score: shown_scores.append(score))

    config = dict(DEFAULT_CONFIG)
    config["tickIntervalSeconds"] = 0

    mgr = SessionManager()
    session = mgr.start_session("dev-test")

    summary_payload = run_session(
        session_mgr=mgr,
        device_id="dev-test",
        config=config,
        camera=_FakeCamera(),
        detector=_FakeDetector(detections_per_tick, stop_event),
        stop_event=stop_event,
    )

    assert len(created_sessions) == 1
    assert created_sessions[0]["session_id"] == session.session_id
    assert created_sessions[0]["device_id"] == "dev-test"
    assert created_sessions[0]["title"] is None

    assert len(emitted_ticks) == 3
    assert [t["engagementScore"] for t in emitted_ticks] == [100, 40, 0]
    assert shown_scores == [100, 40, 0]

    for tick in emitted_ticks:
        jsonschema.validate(tick, metric_schema)

    assert len(completed_sessions) == 1
    assert completed_sessions[0]["session_id"] == session.session_id
    assert completed_sessions[0]["summary"] == summary_payload

    assert summary_payload["deviceId"] == "dev-test"
    assert summary_payload["sessionId"] == session.session_id
    assert summary_payload["tickCount"] == 3
    assert summary_payload["averageEngagement"] == 46.67
    assert summary_payload["timelineRef"].endswith("/liveData")
    jsonschema.validate(summary_payload, summary_schema)
