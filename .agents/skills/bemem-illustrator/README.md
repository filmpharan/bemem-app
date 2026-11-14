# bemem Illustrator skill — art-production tools

This folder is a **Codex project skill**, not a software installer. Put the complete `bemem-illustrator` folder under:

`C:\ฉันจะทำเว็บไซด์\bemem-app\.agents\skills\bemem-illustrator\`

## Recommended tools (on Windows)

- **Krita** (optional): original hand-painted sticker sources; retain `.kra` and export transparent sRGB PNG.
- **Inkscape** (required if using `.svg` sources): vector artwork and precise Pipe Mania-style frame joints. Official documentation: https://wiki.inkscape.org/wiki/Using_the_Command_Line
- **Python 3.10+ with Pillow** (art export/QA only): validates transparent assets and builds the review sheet and manifest. Do not install into the app's runtime dependency list.

Before installing anything, check existing programs and obtain permission if missing. Download software from official vendors. No automatic installations are performed by this skill.

## One-command artwork QA

Create an `artwork-source` folder next to this file. Put **one source per ID** in it, named exactly as in `SKILL.md`. Accepted inputs are SVG (96x96 viewBox), or a sufficiently large, square, *already transparent* PNG/WebP. Krita `.kra` sources must first be exported to transparent PNG.

In PowerShell, from this folder:

```powershell
python scripts/prepare_assets.py --input artwork-source --output artwork-review
```

If `inkscape.exe` is not in PATH:

```powershell
python scripts/prepare_assets.py --input artwork-source --output artwork-review --inkscape "C:\Program Files\Inkscape\bin\inkscape.exe"
```

If Pillow is missing, request approval to add it to the *artwork Python environment*, not the app; this skill cannot install dependencies merely by being read.

Expected output:

- `artwork-review/png/*.png`: 13 actual 192x192 RGBA transparent PNG images
- `artwork-review/contact-sheet.png`: visual QA (checkerboard shown only in this preview)
- `artwork-review/asset-manifest.json`: asset paths, stable IDs, dimensions, alpha and connection metadata

The script explicitly **rejects opaque background artwork** rather than attempting unsafe automatic background removal. It also checks the required frame edge connectors. Good aesthetics, tiny-scale legibility, and seamless visual joins must still be approved by a human.

**No Wallet/Home/UI code changes are authorized by running this artwork QA.**
