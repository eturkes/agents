#!/usr/bin/env python3
"""Check authenticated VM pages, report identity and the Rehab application."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--baseline", type=Path)
    args = parser.parse_args()
    baseline = json.loads(args.baseline.read_text()) if args.baseline else None
    lines = (Path.home() / ".local/share/eturkes/web-credentials.txt").read_text().splitlines()
    opener, result = build_opener(NoRedirect()), {}
    for vm in ("nanoha", "naoto", "rehab"):
        origin = f"https://{vm}.eturkes.com"
        sections = [i for i, line in enumerate(lines) if origin in line]
        if len(sections) != 1:
            raise RuntimeError(f"{vm}: credential section differs")
        fields = dict(line.split(":", 1) for line in lines[sections[0] + 1:sections[0] + 3]
                      if ":" in line)
        fields = {key.strip().lower(): value.strip() for key, value in fields.items()}
        token = base64.b64encode((fields["username"] + ":" + fields["password"]).encode()).decode()
        headers = {"Authorization": "Basic " + token}
        paths = ["/", "/healthz", "/api/state", "/api/versions"]
        if vm != "rehab":
            paths.append("/report/current")
        checks = {}
        for path in paths:
            with opener.open(Request(origin + path, headers=headers), timeout=20) as response:
                if response.status != 200:
                    raise RuntimeError(f"{vm} {path}: HTTP {response.status}")
                digest, size = hashlib.sha256(), 0
                for chunk in iter(lambda: response.read(1024 * 1024), b""):
                    size += len(chunk)
                    if size > 256 * 1024 * 1024:
                        raise RuntimeError(f"{vm} {path}: response exceeds bound")
                    digest.update(chunk)
                checks[path] = {"status": response.status, "bytes": size, "sha256": digest.hexdigest()}
        try:
            with opener.open(origin + "/", timeout=10):
                raise RuntimeError(f"{vm}: authentication boundary differs")
        except HTTPError as error:
            if error.code != 401:
                raise RuntimeError(f"{vm}: unauthenticated HTTP {error.code}") from error
        if baseline and vm != "rehab" and checks["/report/current"] != baseline[vm]["/report/current"]:
            raise RuntimeError(f"{vm}: published report differs")
        result[vm] = checks
        print(f"{vm}: authenticated page/health/state/history 200; unauthenticated 401"
              + ("; report 200" if vm != "rehab" else ""))
    with opener.open("https://rehab-app.eturkes.com/healthz", timeout=10) as response:
        if response.status != 200 or response.read(1024) != b"ok\n":
            raise RuntimeError("Rehab application health differs")
    print("Rehab embedded application health: 200")
    if args.output:
        args.output.write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    main()
