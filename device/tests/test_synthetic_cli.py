import json
import os
import subprocess
import sys


def test_synthetic_cli_dry_run_outputs_parseable_json_payload():
    env = dict(os.environ)

    proc = subprocess.run(
        [sys.executable, "-m", "synthetic", "--sessions", "1", "--duration", "1", "--dry-run"],
        capture_output=True,
        text=True,
        check=True,
        env=env,
    )

    out = proc.stdout
    start = out.find("{")
    assert start != -1, f"Expected JSON object in stdout, got: {out[:200]}"

    decoder = json.JSONDecoder()
    payload, _ = decoder.raw_decode(out[start:])

    assert "session" in payload
    assert "ticks" in payload
    assert payload["session"]["status"] == "completed"
    assert len(payload["ticks"]) > 0
