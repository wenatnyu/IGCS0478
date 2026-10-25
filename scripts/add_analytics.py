"""Attach the disabled-by-default visitor tracker to tracked public HTML pages."""
from pathlib import Path
import os
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    pages = [ROOT / name for name in names if name.endswith('.html') and not name.startswith('analytics/')]
    count = 0
    for page in pages:
        source = page.read_text()
        if 'assets/analytics.js' in source or '</head>' not in source:
            continue
        prefix = os.path.relpath(ROOT / 'assets', page.parent)
        tags = (f'<link rel="stylesheet" href="{prefix}/analytics.css">\n'
                f'<script src="{prefix}/analytics-config.js" defer></script>\n'
                f'<script src="{prefix}/analytics.js" defer></script>\n')
        page.write_text(source.replace('</head>', tags + '</head>', 1))
        count += 1
    print(f'Attached analytics configuration and script to {count} pages; collection remains disabled by default.')


if __name__ == '__main__':
    main()
