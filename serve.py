#!/usr/bin/env python3
"""Serve the Photo Collage Editor on localhost for development.

The page also works when opened directly from disk (file://). This server is
only convenient for consistent behavior, cache-free reloads, and testing
features that browsers restrict on the file: protocol.

Usage:
    python serve.py            # http://localhost:8000
    python serve.py -p 8080    # custom port
    python serve.py --no-open  # don't launch a browser
"""

from __future__ import annotations

import argparse
import functools
import http.server
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static file handler that never lets the browser cache during development."""

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        sys.stderr.write(f"  {self.address_string()} - {format % args}\n")


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve the Photo Collage Editor on localhost."
    )
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"port to listen on (default: {DEFAULT_PORT})",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="do not open the page in a web browser",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    handler = functools.partial(Handler, directory=str(ROOT))

    try:
        server = Server(("127.0.0.1", args.port), handler)
    except OSError as exc:
        print(f"error: cannot listen on 127.0.0.1:{args.port} ({exc})", file=sys.stderr)
        print("hint: pick another port with -p, or stop the process using it.", file=sys.stderr)
        return 1

    url = f"http://localhost:{args.port}/"
    print(f"Serving {ROOT}")
    print(f"  {url}")
    print("Press Ctrl+C to stop.")

    if not args.no_open:
        threading.Timer(0.5, webbrowser.open, args=(url,)).start()

    try:
        with server:
            server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
