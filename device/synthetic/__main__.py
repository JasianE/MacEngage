"""CLI entry point for synthetic session generation.

Usage:
    python -m synthetic --sessions 5
    python -m synthetic --sessions 3 --device-id pi-demo --duration 20
    python -m synthetic --sessions 1 --dry-run
"""

import argparse
import json
import logging
import os
import socket
import sys
from datetime import datetime, timedelta, timezone

from engagement_monitor import emitter
from synthetic.generator import generate_session

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate synthetic engagement sessions and write to Firestore."
    )
    parser.add_argument(
        "--sessions", "-n",
        type=int,
        default=5,
        help="Number of synthetic sessions to generate (default: 5)",
    )
    parser.add_argument(
        "--device-id",
        type=str,
        default=os.environ.get("DEVICE_ID", socket.gethostname()),
        help="Device identifier (default: DEVICE_ID env var or hostname)",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=30,
        help="Duration of each session in minutes (default: 30)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print generated payloads as JSON to stdout instead of writing to Firestore",
    )
    args = parser.parse_args()

    print(f"Generating {args.sessions} synthetic session(s)...")
    print(f"  Device: {args.device_id}")
    print(f"  Duration: {args.duration} min each")
    print(f"  Mode: {'DRY RUN (stdout)' if args.dry_run else 'Firestore'}")
    print()

    # Space sessions out over the past N days
    now = datetime.now(timezone.utc)
    session_gap_hours = max(2, (args.sessions * args.duration) // 60 + 1)

    for i in range(args.sessions):
        # Start time: spread sessions backwards from now
        start_time = now - timedelta(hours=(args.sessions - i) * session_gap_hours)

        ticks, summary = generate_session(
            device_id=args.device_id,
            start_time=start_time,
            duration_minutes=args.duration,
        )

        session_id = summary["sessionId"]

        if args.dry_run:
            # Print payloads to stdout as JSON
            output = {
                "session": {
                    "sessionId": session_id,
                    "title": f"Session {session_id[:8]} ({args.device_id})",
                    "overallScore": summary["averageEngagement"],
                    "comments": [],
                },
                "liveData": [
                    {
                        "timeSinceStart": int((datetime.fromisoformat(tick["timestamp"]) - datetime.fromisoformat(summary["startedAt"])).total_seconds()),
                        "engagementScore": tick["engagementScore"],
                    }
                    for tick in ticks
                ],
            }
            print(json.dumps(output, indent=2))
            print()
        else:
            # Write session document to Firestore
            emitter.create_session(
                session_id=session_id,
                device_id=args.device_id,
                started_at=summary["startedAt"],
            )

            # Write all tick documents
            for tick in ticks:
                time_since_start = int(
                    (
                        datetime.fromisoformat(tick["timestamp"])
                        - datetime.fromisoformat(summary["startedAt"])
                    ).total_seconds()
                )
                emitter.emit_tick(session_id, tick, time_since_start)

            # Complete session with summary
            emitter.complete_session(
                session_id=session_id,
                ended_at=summary["endedAt"],
                summary=summary,
            )

        print(
            f"  [{i + 1}/{args.sessions}] Session {session_id[:8]}... "
            f"| {len(ticks)} ticks "
            f"| avg={summary['averageEngagement']:.1f} "
            f"| {summary['startedAt'][:16]}"
        )

    print(f"\nDone. {args.sessions} session(s) generated.")

    if not args.dry_run:
        emitter.close()


if __name__ == "__main__":
    main()
