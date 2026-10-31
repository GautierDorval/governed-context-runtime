# SPDX-License-Identifier: Apache-2.0
"""Independent development oracle: Python's JSON encoder and Unicode database."""
import json
import pathlib
import platform
import sys
import unicodedata

source, destination = map(pathlib.Path, sys.argv[1:3])
if source.stat().st_size > 8 * 1024 * 1024:
    raise ValueError("bounded oracle input exceeded")
values = json.loads(source.read_text(encoding="utf-8"))

def nfc(value):
    if isinstance(value, str):
        return unicodedata.normalize("NFC", value)
    if isinstance(value, list):
        return [nfc(item) for item in value]
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            key = unicodedata.normalize("NFC", key)
            if key in result:
                raise ValueError("normalized key collision in proposed valid domain")
            result[key] = nfc(item)
        return result
    return value

def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)

result = {
    "version": platform.python_version(),
    "unicodeVersion": unicodedata.unidata_version,
    "historical": [encoded(value) for value in values["historical"]],
    "nfc": [encoded(nfc(value)) for value in values["nfc"]],
    "text": [unicodedata.normalize("NFC", value.replace("\r\n", "\n").replace("\r", "\n").strip()) for value in values["text"]],
}
body = json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
if len(body) > 32 * 1024 * 1024:
    raise ValueError("bounded oracle output exceeded")
destination.write_bytes(body)
print(json.dumps({"version": result["version"], "unicodeVersion": result["unicodeVersion"],
                  "counts": {key: len(result[key]) for key in ("historical", "nfc", "text")}}))
