import os, zlib, struct, math

os.makedirs("public/icons", exist_ok=True)

def generate_icon(width, height, is_maskable=False):
    header = b'\x89PNG\r\n\x1a\n'
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    
    rows = []
    cx = width / 2.0
    cy = height / 2.0
    max_r = width * 0.38 if not is_maskable else width * 0.32
    
    for y in range(height):
        row = bytearray([0]) # filter byte
        for x in range(width):
            # Distance from center
            dx = (x - cx)
            dy = (y - cy)
            dist = math.sqrt(dx*dx + dy*dy)
            
            # Base dark elegant background #0d0d12
            bg_r, bg_g, bg_b = 13, 13, 18
            
            # Soft radial glow towards center
            glow = max(0.0, 1.0 - (dist / (width * 0.6)))
            r = int(bg_r + 30 * glow)
            g = int(bg_g + 20 * glow)
            b = int(bg_b + 35 * glow)
            
            # Heart formula: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
            # Normalize coordinates
            scale = width * 0.28 if not is_maskable else width * 0.24
            nx = (x - cx) / scale
            ny = -(y - (cy - scale * 0.15)) / scale
            
            in_heart = False
            if -1.6 <= nx <= 1.6 and -1.6 <= ny <= 1.6:
                val = (nx**2 + ny**2 - 1.0)**3 - (nx**2) * (ny**3)
                if val <= 0.05:
                    in_heart = True
            
            if in_heart:
                # Warm gold/rose gradient: #E5A962 to #E07A5F
                t = (y / height)
                hr = int(229 * (1 - t) + 224 * t)
                hg = int(169 * (1 - t) + 122 * t)
                hb = int(98 * (1 - t) + 95 * t)
                r, g, b = hr, hg, hb
            elif dist < max_r + 2 and dist > max_r - 2:
                # Subtle gold border ring
                r, g, b = 212, 163, 115
            
            row.extend([min(255, r), min(255, g), min(255, b), 255])
        rows.append(bytes(row))
        
    raw = b''.join(rows)
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

# 192x192
with open("public/icons/icon-192.png", "wb") as f:
    f.write(generate_icon(192, 192, False))

# 512x512
with open("public/icons/icon-512.png", "wb") as f:
    f.write(generate_icon(512, 512, False))

# Maskable 192 & 512 & generic
with open("public/icons/icon-192-maskable.png", "wb") as f:
    f.write(generate_icon(192, 192, True))

with open("public/icons/icon-512-maskable.png", "wb") as f:
    f.write(generate_icon(512, 512, True))

with open("public/icons/icon-maskable.png", "wb") as f:
    f.write(generate_icon(512, 512, True))

print("All PWA icons successfully generated in public/icons")
