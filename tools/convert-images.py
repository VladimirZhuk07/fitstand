"""Convert generated PNGs from img/raw/ into small WebP files for the app.

img/raw/acc-<id>.png        -> img/acc/<id>.webp          512x512
img/raw/part-<id>-<n>.png   -> img/parts/<id>-<n>.webp    512x512
img/raw/type-<id>.png       -> img/types/<id>.webp        720x480, 3:2 cut around the bike; a tall one gets white sides

Usage (from the repo root): python tools/convert-images.py [--raw DIR] [--out DIR] [--dry-run]
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


def plan_jobs(raw: Path, out: Path = ROOT / 'img') -> list[Job]:
    jobs: list[Job] = []
    for source in sorted(raw.glob('*.png')):
        prefix, _, rest = source.stem.partition('-')
        if prefix in FOLDERS:
            folder, size = FOLDERS[prefix]
            jobs.append(Job(source, out / folder / f'{rest}.webp', size))
    return jobs


def convert(job: Job) -> int:
    from PIL import Image  # only needed for real work, not for --dry-run
    # Pillow has no async API; this is a one-shot local CLI, so plain sync file I/O is fine
    job.target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(job.source) as image:
        image = image.convert('RGB')
        if job.size == SQUARE:
            w, h = image.size
            side = min(w, h)  # a centre square, as before
            frame = image.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side))
        else:
            frame = fit_frame(image, job.size)
        small = frame.resize(job.size, Image.Resampling.LANCZOS)
        small.save(job.target, 'WEBP', quality=QUALITY, method=6)
    return job.target.stat().st_size


def fit_frame(image, size):
    """Cut a frame of the target's aspect ratio around the object on a white background.

    The object (everything not near-white) keeps a small margin. If it is too tall for a full-width
    frame (a unicycle), the full-width strip with the object is put on a wider white canvas instead.
    """
    from PIL import Image
    w, h = image.size
    ratio = size[0] / size[1]
    box = image.convert('L').point(lambda v: 255 if v < 235 else 0).getbbox() or (0, 0, w, h)
    margin = round(h * 0.04)
    top, bottom = max(0, box[1] - margin), min(h, box[3] + margin)
    want = round(w / ratio)
    if bottom - top <= want:
        centre = (top + bottom) // 2
        top = min(max(0, centre - want // 2), h - want)
        return image.crop((0, top, w, top + want))
    strip = image.crop((0, top, w, bottom))
    canvas = Image.new('RGB', (round((bottom - top) * ratio), bottom - top), 'white')
    canvas.paste(strip, ((canvas.width - w) // 2, 0))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser(description='Convert generated PNGs into small WebP files.')
    parser.add_argument('--raw', type=Path, default=RAW, help='folder with the PNGs (default: img/raw)')
    parser.add_argument('--out', type=Path, default=ROOT / 'img', help='where acc/, parts/, types/ go (default: img)')
    parser.add_argument('--dry-run', action='store_true', help='print the jobs as JSON lines, write nothing')
    args = parser.parse_args()
    jobs = plan_jobs(args.raw, args.out)
    if args.dry_run:
        for job in jobs:
            print(json.dumps({'source': str(job.source), 'target': str(job.target), 'size': list(job.size)}))
        return
    total = sum(convert(job) for job in jobs)
    print(f'converted {len(jobs)} images, {total // 1024} KB in total')


if __name__ == '__main__':
    main()
