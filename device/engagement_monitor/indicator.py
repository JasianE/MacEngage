"""Terminal-based glanceable engagement indicator."""

import logging

logger = logging.getLogger(__name__)


def show(score: int) -> None:
    """Display a single-line ANSI color-coded engagement bar.

    Colors:
        - Green (≥70): High engagement
        - Yellow (≥40): Moderate engagement
        - Red (<40): Low engagement

    Uses carriage return for in-place updates.

    Args:
        score: Engagement score in [0, 100].
    """
    if score >= 70:
        color = "\033[92m"  # bright green
    elif score >= 40:
        color = "\033[93m"  # bright yellow
    else:
        color = "\033[91m"  # bright red

    reset = "\033[0m"
    filled = score // 5
    empty = 20 - filled
    bar = "█" * filled + "░" * empty

    logger.debug("Indicator: score=%d, color=%s", score, "green" if score >= 70 else "yellow" if score >= 40 else "red")
    print(f"\r{color}Engagement: [{bar}] {score:3d}/100{reset}", end="", flush=True)
