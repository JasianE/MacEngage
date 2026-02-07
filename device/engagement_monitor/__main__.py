"""Entry point for `python -m engagement_monitor`."""

import logging
import os
import socket

from engagement_monitor.main import main

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

if __name__ == "__main__":
    device_id = os.environ.get("DEVICE_ID", socket.gethostname())
    main(device_id)
