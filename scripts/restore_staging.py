#!/usr/bin/env python3
"""Decode _staging/*.gz.b64 (or .part0+.part1) into real source paths."""
import base64, gzip, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
staging = root / "_staging"
if not staging.exists():
    print("no _staging"); sys.exit(0)

bases = {}
for f in staging.iterdir():
    if not f.is_file():
        continue
    n = f.name
    if n.endswith(".gz.b64.part0") or n.endswith(".gz.b64.part1"):
        base = n.rsplit(".part", 1)[0]
        bases.setdefault(base, {})[n.rsplit(".part", 1)[1]] = f
    elif n.endswith(".gz.b64"):
        bases.setdefault(n, {})["full"] = f

for base, parts in sorted(bases.items()):
    if "0" in parts and "1" in parts:
        data_b64 = parts["0"].read_text().strip() + parts["1"].read_text().strip()
        to_delete = [parts["0"], parts["1"]]
    elif "full" in parts:
        data_b64 = parts["full"].read_text().strip()
        to_delete = [parts["full"]]
    else:
        print("skip incomplete", base, list(parts))
        continue
    name = base[: -len(".gz.b64")]
    rel = name.replace("__", "/")
    out = root / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    raw = gzip.decompress(base64.b64decode(data_b64))
    out.write_bytes(raw)
    print("restored", rel, len(raw))
    for p in to_delete:
        p.unlink()

try:
    staging.rmdir()
except OSError:
    pass
probe = root / "_upload_probe.txt"
if probe.exists():
    probe.unlink()
print("done")
