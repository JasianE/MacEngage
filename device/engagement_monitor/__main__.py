"""Entry point for `python -m engagement_monitor`."""

import logging
import os
import socket

from engagement_monitor.main import main

# Configure structured logging
_LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, _LOG_LEVEL, logging.INFO),
    format="%(message)s",
)

# Keep runtime console output compact: show detector state logs, suppress noisy internals.
logging.getLogger("engagement_monitor.main").setLevel(logging.WARNING)
logging.getLogger("engagement_monitor.config").setLevel(logging.WARNING)
logging.getLogger("engagement_monitor.emitter").setLevel(logging.WARNING)

if __name__ == "__main__":
    device_id = os.environ.get("DEVICE_ID", socket.gethostname())
    main(device_id)
