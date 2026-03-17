#!/usr/bin/env python3
"""
Generate a high-resolution app icon for Parashari Precision.
Creates an Apple-style icon with cosmic/astrology theme.
"""

from PIL import Image, ImageDraw, ImageFilter
import math
import os

def create_astrology_icon(size=1024):
    """Create a high-resolution astrology-themed icon."""

    # Create image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors from the app's theme
    cosmic_black = (12, 10, 9, 255)       # #0C0A09
    gold = (202, 138, 4, 255)             # #CA8A04
    gold_light = (251, 191, 36, 255)      # #FBBF24
    gold_dark = (161, 98, 7, 255)         # #A16107
    star_white = (255, 255, 255, 255)

    # Background - rounded square with gradient effect
    margin = int(size * 0.05)
    radius = int(size * 0.22)

    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=cosmic_black
    )

    # Add subtle gradient ring
    center = size // 2
    inner_radius = int(size * 0.35)
    outer_radius = int(size * 0.42)

    # Draw concentric circles for depth
    for r in range(outer_radius, inner_radius, -2):
        alpha = int(255 * (1 - (outer_radius - r) / (outer_radius - inner_radius)) * 0.3)
        draw.ellipse(
            [center - r, center - r, center + r, center + r],
            outline=(*gold_dark[:3], alpha)
        )

    # Draw the main cosmic design - stylized eye/star pattern
    # This is similar to the News app's eye-like design

    # Outer golden ring
    eye_radius = int(size * 0.28)
    draw.ellipse(
        [center - eye_radius, center - eye_radius, center + eye_radius, center + eye_radius],
        outline=gold,
        width=int(size * 0.025)
    )

    # Inner golden ring
    inner_eye_radius = int(size * 0.22)
    draw.ellipse(
        [center - inner_eye_radius, center - inner_eye_radius, center + inner_eye_radius, center + inner_eye_radius],
        outline=gold,
        width=int(size * 0.015)
    )

    # Central glowing core - like a planet or sun
    core_radius = int(size * 0.12)

    # Create radial gradient effect for core
    for r in range(core_radius, 0, -1):
        ratio = r / core_radius
        # Interpolate between gold and gold_light
        r_val = int(gold[0] * ratio + gold_light[0] * (1 - ratio))
        g_val = int(gold[1] * ratio + gold_light[1] * (1 - ratio))
        b_val = int(gold[2] * ratio + gold_light[2] * (1 - ratio))
        draw.ellipse(
            [center - r, center - r, center + r, center + r],
            fill=(r_val, g_val, b_val, 255)
        )

    # Add rays/star points around the design (8 points like a compass)
    ray_length = int(size * 0.08)
    ray_distance = int(size * 0.38)

    for angle_deg in range(0, 360, 45):
        angle = math.radians(angle_deg)
        x1 = center + int(ray_distance * math.cos(angle))
        y1 = center + int(ray_distance * math.sin(angle))
        x2 = center + int((ray_distance + ray_length) * math.cos(angle))
        y2 = center + int((ray_distance + ray_length) * math.sin(angle))
        draw.line([x1, y1, x2, y2], fill=gold, width=int(size * 0.02))

    # Add small decorative dots (stars)
    star_positions = [
        (int(size * 0.15), int(size * 0.25)),
        (int(size * 0.85), int(size * 0.20)),
        (int(size * 0.20), int(size * 0.80)),
        (int(size * 0.82), int(size * 0.75)),
        (int(size * 0.30), int(size * 0.15)),
        (int(size * 0.70), int(size * 0.12)),
    ]

    for sx, sy in star_positions:
        star_size = int(size * 0.03)
        draw.ellipse(
            [sx - star_size, sy - star_size, sx + star_size, sy + star_size],
            fill=gold_light
        )

    return img


def create_icon_set():
    """Create all required icon sizes for macOS app icon."""

    # Required sizes for macOS app icons
    sizes = [16, 32, 64, 128, 256, 512, 1024]

    # Also create @2x variants
    icon_images = {}

    for size in sizes:
        print(f"Creating {size}x{size} icon...")
        img = create_astrology_icon(size)
        icon_images[size] = img

    return icon_images


def save_as_icns(icon_images, output_dir):
    """Save icons in a format suitable for Xcode."""

    # For Xcode, we need PNG files in AppIcon.appiconset
    # macOS will handle the ICNS generation

    appiconset_dir = os.path.join(output_dir, 'AppIcon.appiconset')
    os.makedirs(appiconset_dir, exist_ok=True)

    # Create Contents.json for the asset catalog
    contents = {
        "images": [],
        "info": {
            "author": "xcode",
            "version": 1
        }
    }

    # Mapping of sizes to filename suffixes
    size_map = [
        {"size": "16x16", "filename": "icon_16x16.png", "scale": "1x"},
        {"size": "16x16", "filename": "icon_16x16@2x.png", "scale": "2x"},
        {"size": "32x32", "filename": "icon_32x32.png", "scale": "1x"},
        {"size": "32x32", "filename": "icon_32x32@2x.png", "scale": "2x"},
        {"size": "128x128", "filename": "icon_128x128.png", "scale": "1x"},
        {"size": "128x128", "filename": "icon_128x128@2x.png", "scale": "2x"},
        {"size": "256x256", "filename": "icon_256x256.png", "scale": "1x"},
        {"size": "256x256", "filename": "icon_256x256@2x.png", "scale": "2x"},
        {"size": "512x512", "filename": "icon_512x512.png", "scale": "1x"},
        {"size": "512x512", "filename": "icon_512x512@2x.png", "scale": "2x"},
    ]

    for size_info in size_map:
        size_str = size_info["size"]
        scale = size_info["scale"]
        filename = size_info["filename"]

        # Parse size
        w, h = map(int, size_str.split('x'))

        # Get actual pixel size
        if scale == "2x":
            w *= 2
            h *= 2

        # Resize to exact size needed
        if w in icon_images:
            resized = icon_images[w].resize((w, h), Image.Resampling.LANCZOS)
            resized.save(os.path.join(appiconset_dir, filename))

        contents["images"].append({
            "filename": filename,
            "idiom": "mac",
            "scale": scale,
            "size": size_str
        })

    # Write Contents.json
    import json
    with open(os.path.join(appiconset_dir, 'Contents.json'), 'w') as f:
        json.dump(contents, f, indent=2)

    print(f"Saved icon set to {appiconset_dir}")
    return appiconset_dir


def main():
    """Main function to generate the app icon."""

    # Fixed path to the desktop app resources
    resources_dir = '/Users/thotas/Development/Claude/AstroGuru/desktop/ParashariPrecision/Resources/Assets.xcassets'
    project_root = '/Users/thotas/Development/Claude/AstroGuru'

    print("Generating app icons...")
    print(f"Output directory: {resources_dir}")

    # Create icon images
    icon_images = create_icon_set()

    # Save as icon set
    save_as_icns(icon_images, resources_dir)

    print("\nApp icon generation complete!")
    print(f"Icons saved to: {resources_dir}")

    # Also create a standalone 1024x1024 icon in the project root for reference
    large_icon = create_astrology_icon(1024)
    large_icon.save(os.path.join(project_root, 'app-icon.png'))
    print(f"Also saved: {os.path.join(project_root, 'app-icon.png')}")


if __name__ == "__main__":
    main()
