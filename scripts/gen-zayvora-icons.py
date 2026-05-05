"""
Generate Zayvora PWA icons from a source image.
Usage: python3 scripts/gen-zayvora-icons.py <source-image>
"""
import sys
import os
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else 'zayvora-logo.jpg'
out_dir = 'zayvora-pwa/icons'
os.makedirs(out_dir, exist_ok=True)

img = Image.open(src).convert('RGBA')

for size in [192, 512]:
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(f'{out_dir}/icon-{size}.png', 'PNG')
    print(f'Generated {out_dir}/icon-{size}.png')
