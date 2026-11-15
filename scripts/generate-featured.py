"""Generate featured.png for Quantum Escrow, 1600 by 900, deep green and warm cream."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1600, 900
GREEN = (11, 61, 32)
GREEN2 = (20, 83, 45)
CREAM = (250, 246, 236)
CREAM2 = (255, 253, 246)
GOLD = (183, 121, 31)
INK = (28, 43, 31)
MUTED = (90, 107, 93)
LINE = (216, 207, 184)

serif_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
serif = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
sans = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
sans_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

img = Image.new("RGB", (W, H), GREEN)
d = ImageDraw.Draw(img)
d.rectangle([0, 0, W, 90], fill=GREEN2)
d.text((80, 28), "QORECHAIN  TESTNET  |  EVM 9800", font=font(sans_bold, 26), fill=(217, 232, 220))
d.text((1180, 28), "DEMO MODE", font=font(sans_bold, 26), fill=(243, 217, 139))
d.text((80, 150), "Quantum Escrow", font=font(serif_bold, 110), fill=CREAM)
d.text((82, 285), "Milestone payment, approved the quantum safe way.", font=font(serif, 40), fill=(217, 232, 220))
d.line([(80, 360), (1520, 360)], fill=GOLD, width=4)

card = [80, 410, 1520, 800]
d.rounded_rectangle(card, radius=24, fill=CREAM2, outline=LINE, width=2)
d.text((130, 445), "ESCROW LEDGER  |  MILESTONE 0", font=font(sans_bold, 28), fill=GREEN)
d.text((130, 495), "Homepage build, milestone 1", font=font(serif_bold, 46), fill=INK)
d.text((130, 560), "250 fUSD held  |  Freelancer: Ada  |  Window: 7 days", font=font(sans, 30), fill=MUTED)
steps = [("Created", True), ("Funded", True), ("Approved, hybrid", True), ("Released", False)]
x = 130
y = 660
d.line([(x + 12, y + 12), (x + 1080, y + 12)], fill=LINE, width=6)
for label, done in steps:
    color = GREEN if done else (203, 213, 206)
    d.ellipse([x, y, x + 24, y + 24], fill=color, outline=GREEN, width=2)
    d.text((x - 6, y + 42), label, font=font(sans_bold, 26), fill=GREEN if done else MUTED)
    x += 360
d.text((130, 745), "Classical only approval: REJECTED  |  Hybrid approval: ACCEPTED", font=font(sans_bold, 26), fill=(155, 44, 44))
img.save("/home/hatch/workspace/qorechain/quantum-escrow/featured.png")
print("saved featured.png", img.size)
