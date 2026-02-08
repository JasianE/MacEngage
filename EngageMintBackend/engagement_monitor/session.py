"""Session lifecycle management — start, end, state enforcement."""

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class Session:
    """Represents an active monitoring session."""

    session_id: str
    device_id: str
    user_id: str | None
    started_at: datetime
    status: str = "active"


@dataclass
class SessionSummary:
    """Aggregate statistics computed when a session ends."""

    session_id: str
    device_id: str
    started_at: datetime
    ended_at: datetime
    duration_seconds: int
    average_engagement: float
    tick_count: int
    timeline_ref: str


class SessionManager:
    """Manages session lifecycle with state enforcement.

    Ensures only one session is active at a time and provides clean
    start/end transitions with summary computation.
    """

    def __init__(self):
        self._active_session: Session | None = None
        self._scores: list[int] = []
        self._tick_count: int = 0

    @property
    def is_active(self) -> bool:
        """Whether a session is currently active."""
        return self._active_session is not None

    @property
    def active_session(self) -> Session | None:
        """The currently active session, or None."""
        return self._active_session

    def start_session(self, device_id: str, user_id: str | None = None) -> Session:
        """Start a new monitoring session.

        Args:
            device_id: Identifier of the device running the session.

        Returns:
            The newly created Session.

        Raises:
            RuntimeError: If a session is already active.
        """
        if self._active_session is not None:
            raise RuntimeError(
                f"Cannot start session — session {self._active_session.session_id} "
                f"is already active. End it first."
            )

        session_id = str(uuid.uuid4())
        started_at = datetime.now(timezone.utc)

        self._active_session = Session(
            session_id=session_id,
            device_id=device_id,
            user_id=user_id,
            started_at=started_at,
        )
        self._scores = []
        self._tick_count = 0

        logger.info(
            "Session started: %s on device %s", session_id, device_id
        )
        return self._active_session

    def record_tick(self, score: int) -> None:
        """Record a tick's engagement score for summary computation.

        Args:
            score: Engagement score for this tick.

        Raises:
            RuntimeError: If no session is active.
        """
        if self._active_session is None:
            raise RuntimeError("Cannot record tick — no active session.")
        self._scores.append(score)
        self._tick_count += 1

    def end_session(self) -> SessionSummary:
        """End the active session and compute its summary.

        Returns:
            SessionSummary with aggregate statistics.

        Raises:
            RuntimeError: If no session is active.
        """
        if self._active_session is None:
            raise RuntimeError("Cannot end session — no active session.")

        session = self._active_session
        ended_at = datetime.now(timezone.utc)
        duration_seconds = max(1, int((ended_at - session.started_at).total_seconds()))
        average_engagement = (
            sum(self._scores) / len(self._scores) if self._scores else 0.0
        )
        tick_count = self._tick_count if self._tick_count > 0 else max(1, len(self._scores))

        summary = SessionSummary(
            session_id=session.session_id,
            device_id=session.device_id,
            started_at=session.started_at,
            ended_at=ended_at,
            duration_seconds=duration_seconds,
            average_engagement=average_engagement,
            tick_count=tick_count,
            timeline_ref=f"sessions/{session.session_id}/liveData",
        )

        logger.info(
            "Session ended: %s — duration=%ds, avg_engagement=%.1f, ticks=%d",
            session.session_id,
            duration_seconds,
            average_engagement,
            tick_count,
        )

        self._active_session = None
        self._scores = []
        self._tick_count = 0

        return summary
