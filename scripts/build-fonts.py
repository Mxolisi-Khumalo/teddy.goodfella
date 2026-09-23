"""
Builds the self-hosted, subset woff2 faces in src/fonts/.

Python rather than Node because fontTools is the tool for this; there is no
equivalent in the JS ecosystem that does variable-font instancing and subsetting
as reliably. It is a local build tool, not a project dependency — nothing enters
package.json or the bundle.

    pip install fonttools brotli
    python scripts/build-fonts.py

Both families are SIL OFL 1.1 with NO Reserved Font Name declared, so subsetting
and format conversion are permitted and no rename is required. The licence text is
copied to src/fonts/OFL-Redaction.txt as the OFL requires it to travel with the
files.

WHY EACH FACE EXISTS
  Redaction has no variable font — 21 static CFF faces, 7 optical grades x
  {Regular 400, Italic 400, Bold 700}. So the "variable where offered" rule does not
  apply to it and we take exactly the weights used.

  Public Sans IS variable (wght 100-900, one file), so one face covers every weight.
  Its axis DEFAULTS TO 100 (Thin), which matters: next/font/local derives its
  fallback metrics from the binary's hmtx, so an un-re-defaulted file makes the
  browser match Arial against Thin widths and the swap shifts layout. The instancer
  step below re-defaults the axis to 400 while keeping the full 100-900 range.
"""

import io
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

OUT = Path("src/fonts")
WORK = Path(".fonts-work")

REDACTION_ZIP = "https://www.redaction.us/static/redaction.zip"
PUBLIC_SANS = "https://raw.githubusercontent.com/google/fonts/main/ofl/publicsans/PublicSans%5Bwght%5D.ttf"

# Latin basic + only the punctuation this site actually renders. 104 codepoints.
#   U+0020-007E  whole ASCII printable block. Carries the alphabet, digits, the
#                ampersand, the slash and the full email address including @. Kept
#                whole deliberately: subdividing saves ~150 bytes and turns any
#                future copy edit into a silent-fallback bug.
#   U+00A0       no-break space. Not in the copy yet, but it is the standard fix for
#                a widow in a hero headline, and the hero headline is the LCP text.
#   U+00A7       section sign. In the copy, and it is exactly the bureaucratic
#                register the design language is built on.
#   U+2013 2014  en and em dash. The em dash is in the copy ("15 Mar 2025 — Cape
#                Town"); a ledger of dated engagements will want the en dash.
#   U+2018-201D  curly quotes. Prose copy will acquire apostrophes.
#   U+2026       ellipsis.
TEXT_RANGE = "U+0020-007E,U+00A0,U+00A7,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026"

# The degraded grade is only ever used for stamps and seals, which are uppercase
# short strings and reference numbers. Subsetting it to that alphabet instead of the
# full text range is most of why it costs almost nothing.
STAMP_RANGE = "U+0020,U+002D,U+002E,U+002F,U+0030-0039,U+0041-005A"

# Redaction 20 is the degraded grade. 10 is subtler but carries far more contour
# data; 100 is "nearly illegible" per the foundry and a status stamp has to be read.
# 20 is the first grade that reads as overprinted ink rather than as a damaged file.
FACES = [
    {
        "name": "redaction-regular",
        "src": "OTF/Redaction-Regular.otf",
        "unicodes": TEXT_RANGE,
        "note": "display 400 — persona line, section headings",
    },
    {
        "name": "redaction-bold",
        "src": "OTF/Redaction-Bold.otf",
        "unicodes": TEXT_RANGE,
        "note": "display 700 — hero name. This is the LCP text and the only preloaded face.",
    },
    {
        "name": "redaction20-bold",
        "src": "OTF/Redaction20-Bold.otf",
        "unicodes": STAMP_RANGE,
        "note": "degraded grade 20, 700 — stamps and seal overlays only",
    },
]


def run(args: list[str]) -> None:
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"FAILED: {' '.join(args)}\n{result.stderr}")


def subset(src: Path, dest: Path, unicodes: str) -> None:
    run(
        [
            sys.executable, "-m", "fontTools.subset", str(src),
            f"--unicodes={unicodes}",
            "--flavor=woff2",
            f"--output-file={dest}",
            # tnum is load-bearing: reference numbers and ledger dates are set with
            # tabular figures so columns align. kern and liga keep the display face
            # looking like itself at 96px.
            "--layout-features+=tnum,kern,liga,calt",
            "--drop-tables+=DSIG",
            "--no-hinting",
            "--desubroutinize",
            # Keep the name table honest about what this file is.
            "--name-IDs+=0,7,13,14",
        ]
    )


def main() -> None:
    WORK.mkdir(exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    # --- Redaction -------------------------------------------------------------
    print("fetching Redaction…")
    outer = io.BytesIO(urllib.request.urlopen(REDACTION_ZIP).read())
    with zipfile.ZipFile(outer) as z:
        inner_name = next(n for n in z.namelist() if n.endswith("Redaction_2_001.zip"))
        inner = io.BytesIO(z.read(inner_name))
        ofl = next(n for n in z.namelist() if n.endswith("OFL.txt"))
        (OUT / "OFL-Redaction.txt").write_bytes(z.read(ofl))

    with zipfile.ZipFile(inner) as z:
        for face in FACES:
            (WORK / Path(face["src"]).name).write_bytes(z.read(face["src"]))

    # --- Public Sans -----------------------------------------------------------
    print("fetching Public Sans…")
    raw = WORK / "PublicSans-raw.ttf"
    raw.write_bytes(urllib.request.urlopen(PUBLIC_SANS).read())

    # Re-default the wght axis to 400 while keeping the full 100-900 range, so the
    # binary's own metrics describe Regular. Without this, next/font/local's
    # generated fallback is matched against Thin and the swap shifts layout.
    redefaulted = WORK / "PublicSans-400default.ttf"
    print("re-defaulting Public Sans wght axis 100 -> 400…")
    run(
        [
            sys.executable, "-m", "fontTools.varLib.instancer", str(raw),
            "wght=100:400:900",
            "--update-name-table",
            f"--output={redefaulted}",
        ]
    )

    # --- subset everything -----------------------------------------------------
    rows = []
    for face in FACES:
        src = WORK / Path(face["src"]).name
        dest = OUT / f"{face['name']}.woff2"
        subset(src, dest, face["unicodes"])
        rows.append((dest.name, src.stat().st_size, dest.stat().st_size, face["note"]))

    dest = OUT / "public-sans-variable.woff2"
    subset(redefaulted, dest, TEXT_RANGE)
    rows.append(
        (
            dest.name,
            raw.stat().st_size,
            dest.stat().st_size,
            "body variable 100-900 — body, ledger rows, UI. Not preloaded.",
        )
    )

    shutil.rmtree(WORK, ignore_errors=True)

    # --- report ----------------------------------------------------------------
    width = max(len(r[0]) for r in rows)
    print(f"\n{'file'.ljust(width)}  {'source':>9}  {'subset':>8}  {'saved':>6}")
    print("-" * (width + 30))
    total = 0
    for name, before, after, _ in rows:
        total += after
        print(f"{name.ljust(width)}  {before:>9,}  {after:>8,}  {100 - after * 100 // before:>5}%")
    print("-" * (width + 30))
    print(f"{'TOTAL'.ljust(width)}  {'':>9}  {total:>8,}  ({total / 1024:.1f} KiB)\n")
    for name, _, after, note in rows:
        print(f"  {name}  ({after / 1024:.1f} KiB)\n    {note}")


if __name__ == "__main__":
    main()
