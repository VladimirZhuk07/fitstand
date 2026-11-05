"""Convert generated PNGs from img/raw/ into small WebP files for the app.

img/raw/acc-<id>.png        -> img/acc/<id>.webp          512x512
img/raw/part-<id>-<n>.png   -> img/parts/<id>-<n>.webp    512x512
img/raw/type-<id>.png       -> img/types/<id>.webp        720x480, centre crop to 3:2

Usage (from the repo root): python tools/convert-images.py [--raw DIR] [--dry-run]
  --dry-run  print the jobs as JSON lines, write nothing
Needs Pillow: python -m pip install --user Pillow
"""
import argparse
import json
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'img' / 'raw'
SQUARE = (512, 512)
WIDE = (720, 480)    # bike types: a bike is long, a square would leave it small
QUALITY = 80
FOLDERS = {'acc': ('acc', SQUARE), 'part': ('parts', SQUARE), 'type': ('types', WIDE)}


@dataclass(frozen=True)
class Job:
    source: Path
    target: Path
    size: tuple[int, int]


def plan_jobs(raw: Path) -> list[Job]:
    jobs: list[Job] = []
    for source in sorted(raw.glob('*.png')):
        prefix, _, rest = source.stem.partition('-')
        if prefix in FOLDERS:
            folder, size = FOLDERS[prefix]
            jobs.append(Job(source, ROOT / 'img' / folder / f'{rest}.webp', size))
    return jobs


def convert(job: Job) -> int:
    from PIL import Image  # only needed for real work, not for --dry-run
    # Pillow has no async API; this is a one-shot local CLI, so plain sync file I/O is fine
    job.target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(job.source) as image:
        image = image.convert('RGB')
        w, h = image.size
        tw, th = job.size
        # centre crop to the target's aspect ratio, then resize
        cw, ch = (w, round(w * th / tw)) if w * th <= h * tw else (round(h * tw / th), h)
        left, top = (w - cw) // 2, (h - ch) // 2
        small = image.crop((left, top, left + cw, top + ch)).resize(job.size, Image.Resampling.LANCZOS)
        small.save(job.target, 'WEBP', quality=QUALITY, method=6)
    return job.target.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser(description='Convert generated PNGs into small WebP files.')
    parser.add_argument('--raw', type=Path, default=RAW, help='folder with the PNGs (default: img/raw)')
    parser.add_argument('--dry-run', action='store_true', help='print the jobs as JSON lines, write nothing')
    args = parser.parse_args()
    jobs = plan_jobs(args.raw)
    if args.dry_run:
        for job in jobs:
            print(json.dumps({'source': str(job.source), 'target': str(job.target), 'size': list(job.size)}))
        return
    total = sum(convert(job) for job in jobs)
    print(f'converted {len(jobs)} images, {total // 1024} KB in total')


if __name__ == '__main__':
    main()
