from pathlib import Path

from engagement_monitor.detector import _canonicalize_label, _load_labels


def test_canonicalize_label_maps_teachable_machine_labels_to_config_keys():
    assert _canonicalize_label("hands on head") == "hands_on_head"
    assert _canonicalize_label("head down") == "head_down"
    assert _canonicalize_label("Looking at the board") == "looking_at_board"
    assert _canonicalize_label("Looking away") == "looking_away_long"
    assert _canonicalize_label("On phone") == "on_phone"
    assert _canonicalize_label("Raising Hand") == "raising_hand"
    assert _canonicalize_label("Talking to each other") == "talking_to_group"
    assert _canonicalize_label("Writing notes") == "writing_notes"


def test_load_labels_returns_canonicalized_ordered_labels(tmp_path: Path):
    labels_file = tmp_path / "labels.txt"
    labels_file.write_text(
        "\n".join(
            [
                "0 hands on head",
                "1 head down",
                "2 Looking at the board",
                "3 Looking away",
                "4 On phone",
                "5 Raising Hand",
                "6 Talking to each other",
                "7 Writing notes",
            ]
        ),
        encoding="utf-8",
    )

    labels = _load_labels(labels_file)

    assert labels == [
        "hands_on_head",
        "head_down",
        "looking_at_board",
        "looking_away_long",
        "on_phone",
        "raising_hand",
        "talking_to_group",
        "writing_notes",
    ]
