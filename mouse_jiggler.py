"""Continuously move the Windows mouse pointer in a 10x10 pixel square."""

from __future__ import annotations

import argparse
import ctypes
import time
from ctypes import wintypes


class Point(ctypes.Structure):
    _fields_ = [("x", wintypes.LONG), ("y", wintypes.LONG)]


USER32 = ctypes.windll.user32
USER32.GetCursorPos.argtypes = [ctypes.POINTER(Point)]
USER32.GetCursorPos.restype = wintypes.BOOL
USER32.SetCursorPos.argtypes = [ctypes.c_int, ctypes.c_int]
USER32.SetCursorPos.restype = wintypes.BOOL


def get_cursor_position() -> tuple[int, int]:
    point = Point()
    if not USER32.GetCursorPos(ctypes.byref(point)):
        raise ctypes.WinError()
    return point.x, point.y


def move_cursor(x: int, y: int) -> None:
    if not USER32.SetCursorPos(x, y):
        raise ctypes.WinError()


def jiggle_forever(size: int, delay: float) -> None:
    print(
        f"Mouse jiggler running: {size}x{size} pixel square, "
        f"{delay:g}s between moves. Press Ctrl+C to stop."
    )

    while True:
        start_x, start_y = get_cursor_position()
        points = (
            (start_x + size, start_y),
            (start_x + size, start_y + size),
            (start_x, start_y + size),
            (start_x, start_y),
        )

        for x, y in points:
            move_cursor(x, y)
            time.sleep(delay)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Move the mouse forever in a small square pattern."
    )
    parser.add_argument(
        "--size",
        type=int,
        default=10,
        help="length of each side in pixels (default: 10)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="seconds between each move (default: 1)",
    )
    args = parser.parse_args()

    if args.size <= 0:
        parser.error("--size must be greater than zero")
    if args.delay <= 0:
        parser.error("--delay must be greater than zero")

    try:
        jiggle_forever(args.size, args.delay)
    except KeyboardInterrupt:
        print("\nMouse jiggler stopped.")


if __name__ == "__main__":
    main()
