#!/usr/bin/env python3
"""Embed import/*.js Code node sources into Daily Shorts Publisher V3.json.

V3 JSON is based on your working n8n export; edit import/*.js then run this.
Do not replace gemini-title-captions-code.js with old repo variants — keep export logic.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WF = ROOT / "Daily Shorts Publisher V3.json"
MIRROR = ROOT / "workflows" / "daily-shorts-publisher.json"

NODE_TO_IMPORT = {
    "Gemini title + captions": "import/gemini-title-captions-code.js",
    "Collect post links": "import/collect-post-links-code.js",
    "IG Build video URL": "import/ig-build-video-url-code.js",
    "IG Reels 2 Prepare upload": "import/ig-reels-2-prepare-upload-code.js",
    "FB Reels 2 Prepare upload": "import/fb-reels-2-prepare-upload-code.js",
    "FB Resolve page token": "import/fb-resolve-page-token-code.js",
}


def main() -> None:
    wf = json.loads(WF.read_text())
    for node_name, rel in NODE_TO_IMPORT.items():
        code = (ROOT / rel).read_text()
        for n in wf["nodes"]:
            if n.get("name") == node_name and n.get("type") == "n8n-nodes-base.code":
                n["parameters"]["jsCode"] = code
                break
        else:
            raise SystemExit(f"Code node not found: {node_name}")

    meta = wf.setdefault("meta", {})
    meta["templateVersion"] = "v3-embedded-imports"
    meta["embeddedCodeFromImport"] = dict(NODE_TO_IMPORT)

    text = json.dumps(wf, indent=2) + "\n"
    WF.write_text(text)
    MIRROR.write_text(text)
    print(f"Synced {len(NODE_TO_IMPORT)} Code nodes → {WF.name}")


if __name__ == "__main__":
    main()
