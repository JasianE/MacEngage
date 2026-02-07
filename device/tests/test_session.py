from engagement_monitor.session import SessionManager


def test_session_manager_lifecycle():
    mgr = SessionManager()
    session = mgr.start_session("dev-1")

    assert mgr.is_active
    assert session.device_id == "dev-1"

    mgr.record_tick(40)
    mgr.record_tick(80)

    summary = mgr.end_session()
    assert not mgr.is_active
    assert summary.session_id == session.session_id
    assert summary.tick_count == 2
    assert 0 <= summary.average_engagement <= 100
    assert summary.timeline_ref.endswith("/ticks")


def test_session_manager_prevents_overlapping_sessions():
    mgr = SessionManager()
    mgr.start_session("dev-1")

    try:
        mgr.start_session("dev-1")
        assert False, "Expected RuntimeError for overlapping session"
    except RuntimeError:
        pass
