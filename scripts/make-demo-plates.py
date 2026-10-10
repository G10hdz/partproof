# Genera las placas sintéticas de P1 a P4 en demo/photos. Son imágenes preparadas, no fotos reales.
# Uso: python3 scripts/make-demo-plates.py
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONTS = Path('/System/Library/Fonts/Supplemental')
OUT = Path(__file__).resolve().parent.parent / 'demo' / 'photos'

PLATES = [
    ('plate_p1', 'Original Prusa MK4S', 'Nextruder', 'CZPX2024X017XC01482', '24 V DC  360 W', 'Czech Republic', (236, 108, 34)),
    ('plate_p2', 'Original Prusa MK3S', 'E3D V6', 'CZPX1019X004XK00093', '24 V DC  240 W', 'Czech Republic', (236, 108, 34)),
    ('plate_p3', 'Original Prusa MK3S+', 'E3D V6', 'CZPX0721X004XK01127', '24 V DC  240 W', 'Czech Republic', (236, 108, 34)),
    ('plate_p4', 'Creality K1', 'Micro Swiss FlowTech', 'K1-2310-05581', '24 V DC  350 W', 'China', (32, 140, 92)),
]


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def background() -> Image.Image:
    img = Image.new('RGB', (1280, 960), (52, 53, 57))
    d = ImageDraw.Draw(img)
    for y in (90, 790):
        d.rectangle([0, y, 1280, y + 80], fill=(66, 67, 72))
        for x in (120, 1160):
            d.ellipse([x - 14, y + 26, x + 14, y + 54], fill=(25, 25, 27))
    return img


def plate(model: str, hotend: str, serial: str, power: str, origin: str, color: tuple[int, int, int]) -> Image.Image:
    card = Image.new('RGBA', (840, 470), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([0, 0, 839, 469], radius=14, fill=(214, 215, 219, 255), outline=(150, 150, 155, 255), width=3)
    d.rounded_rectangle([0, 0, 839, 96], radius=14, fill=color + (255,))
    d.rectangle([0, 60, 839, 96], fill=color + (255,))
    d.text((34, 18), model, font=font('Arial Bold.ttf', 52), fill=(255, 255, 255, 255))
    rows = [('Model', model), ('Hotend', hotend), ('S/N', serial), ('Input', power), ('Made in', origin)]
    for i, (label, value) in enumerate(rows):
        y = 124 + i * 66
        d.text((36, y), label, font=font('Arial.ttf', 32), fill=(70, 70, 75, 255))
        value_font = font('Courier New Bold.ttf', 30) if label == 'S/N' else font('Arial Bold.ttf', 32)
        d.text((250, y), value, font=value_font, fill=(25, 25, 28, 255))
    return card


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (name, model, hotend, serial, power, origin, color) in enumerate(PLATES):
        img = background()
        card = plate(model, hotend, serial, power, origin, color).rotate((-2.5, 1.5, -1.5, 2.0)[i], expand=True, resample=Image.BICUBIC)
        shadow = Image.new('RGBA', card.size, (0, 0, 0, 0))
        shadow.paste((0, 0, 0, 110), mask=card.split()[3])
        img.paste(shadow.filter(ImageFilter.GaussianBlur(10)), (226, 236), shadow.filter(ImageFilter.GaussianBlur(10)))
        img.paste(card, (210, 220), card)
        img.save(OUT / f'{name}.jpg', quality=90)
        print(f'{name}.jpg')


if __name__ == '__main__':
    main()
