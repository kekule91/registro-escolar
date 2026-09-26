#!/usr/bin/env python3
"""Decode _staging: supports .gz.b64, .gz.b64.partN, and .gz.hex.partN"""
import base64, gzip, pathlib, sys, binascii, re
root = pathlib.Path(__file__).resolve().parents[1]
staging = root / "_staging"
if not staging.exists():
    print("no _staging"); sys.exit(0)

hex_bases = {}
b64_bases = {}
for f in staging.iterdir():
    if not f.is_file():
        continue
    n = f.name
    m = re.match(r"^(.*\.gz)\.hex\.part(\d+)$", n)
    if m:
        hex_bases.setdefault(m.group(1), {})[int(m.group(2))] = f
        continue
    if n.endswith(".gz.b64.part0") or n.endswith(".gz.b64.part1"):
        base = n.rsplit(".part", 1)[0]
        b64_bases.setdefault(base, {})[n.rsplit(".part", 1)[1]] = f
    elif n.endswith(".gz.b64"):
        b64_bases.setdefault(n, {})["full"] = f

def write_out(rel, raw):
    out = root / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(raw)
    print("restored", rel, len(raw))

for base, parts in sorted(hex_bases.items()):
    idxs = sorted(parts)
    if idxs != list(range(len(idxs))):
        print("skip incomplete hex", base, idxs); continue
    hx = "".join(parts[i].read_text().strip() for i in idxs)
    raw = gzip.decompress(binascii.unhexlify(hx))
    name = base[: -len(".gz")]
    rel = name.replace("__", "/")
    write_out(rel, raw)
    for p in parts.values():
        p.unlink()

for base, parts in sorted(b64_bases.items()):
    # Skip known-corrupt SchoolContext b64 parts; prefer hex
    if "SchoolContext" in base:
        print("skip b64 SchoolContext (use hex)", base)
        for p in parts.values():
            p.unlink()
        continue
    if "0" in parts and "1" in parts:
        data_b64 = parts["0"].read_text().strip() + parts["1"].read_text().strip()
        to_delete = [parts["0"], parts["1"]]
    elif "full" in parts:
        data_b64 = parts["full"].read_text().strip()
        to_delete = [parts["full"]]
    else:
        print("skip incomplete b64", base, list(parts)); continue
    name = base[: -len(".gz.b64")]
    rel = name.replace("__", "/")
    try:
        raw = gzip.decompress(base64.b64decode(data_b64))
    except Exception as e:
        print("b64 decode fail", rel, e); continue
    write_out(rel, raw)
    for p in to_delete:
        p.unlink()

try:
    staging.rmdir()
except OSError:
    pass
print("done")
