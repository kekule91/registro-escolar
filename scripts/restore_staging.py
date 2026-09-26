#!/usr/bin/env python3
"""One-shot: decode _staging/*.gz.b64 into real source paths, then delete staging."""
import base64, gzip, os, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
staging = root / "_staging"
if not staging.exists():
    print("no _staging"); sys.exit(0)
for f in sorted(staging.glob("*.gz.b64")):
    name = f.name[: -len(".gz.b64")]
    rel = name.replace("__", "/")
    out = root / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    data = gzip.decompress(base64.b64decode(f.read_text()))
    out.write_bytes(data)
    print("restored", rel, len(data))
    f.unlink()
try:
    staging.rmdir()
except OSError:
    pass
probe = root / "_upload_probe.txt"
if probe.exists():
    probe.unlink()
print("done")
