"""Convert generated PNGs from img/raw/ into small WebP files for the app.

img/raw/acc-<id>.png        -> img/acc/<id>.webp
img/raw/part-<id>-<n>.png   -> img/parts/<id>-<n>.webp

Usage (from the repo root): python tools/convert-images.py
Needs Pillow: python -m pip install --user Pillow
"""
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'img' / 'raw'
SIZE = 512
QUALITY = 80


@dataclass(frozen=True)
class Job:
    source: Path
    target: Path


def plan_jobs() -> list[Job]:
    jobs: list[Job] = []
    for source in sorted(RAW.glob('*.png')):
        prefix, _, rest = source.stem.partition('-')
        if prefix == 'acc':
            jobs.append(Job(source, ROOT / 'img' / 'acc' / f'{rest}.webp'))
        elif prefix == 'part':
            jobs.append(Job(source, ROOT / 'img' / 'parts' / f'{rest}.webp'))
    return jobs


def convert(job: Job) -> int:
    # Pillow has no async API; this is a one-shot local CLI, so plain sync file I/O is fine
    job.target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(job.source) as image:
        small = image.convert('RGB').resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        small.save(job.target, 'WEBP', quality=QUALITY, method=6)
    return job.target.stat().st_size


def main() -> None:
    jobs = plan_jobs()
    total = sum(convert(job) for job in jobs)
    print(f'converted {len(jobs)} images, {total // 1024} KB in total')


if __name__ == '__main__':
    main()
