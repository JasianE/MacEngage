from pathlib import Path

import numpy as np

from engagement_monitor.detector import (
    _apply_frame_preprocessing,
    _canonicalize_label,
    _load_labels,
    _load_preprocessing_from_training_capture_config,
)


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


def test_load_preprocessing_from_training_capture_config_reads_flags(tmp_path: Path):
    config_file = tmp_path / "training_capture.json"
    config_file.write_text(
        '{"flip180": true, "swapRedBlue": true}', encoding="utf-8"
    )

    flip180, swap_red_blue = _load_preprocessing_from_training_capture_config(config_file)

    assert flip180 is True
    assert swap_red_blue is True


def test_apply_frame_preprocessing_swap_and_flip_matches_training_capture_behavior():
    # 2x2 image with distinct RGB values per pixel
    frame = np.array(
        [
            [[1, 2, 3], [4, 5, 6]],
            [[7, 8, 9], [10, 11, 12]],
        ],
        dtype=np.uint8,
    )

    processed = _apply_frame_preprocessing(
        frame,
        flip180=True,
        swap_red_blue=True,
    )

    # swap_red_blue then rotate 180
    expected = np.array(
        [
            [[12, 11, 10], [9, 8, 7]],
            [[6, 5, 4], [3, 2, 1]],
        ],
        dtype=np.uint8,
    )

    assert np.array_equal(processed, expected)
