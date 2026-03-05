import cv2
import numpy as np
import json
from scipy.interpolate import splprep, splev
from skimage.morphology import skeletonize

# ==================================================
# CONFIG
# ==================================================

IMAGE_PATH = "jewelry.jpeg"

WORLD_SCALE = 0.02
MIN_AREA = 120
CURVE_POINTS = 260     # smoothness level


# ==================================================
# Coordinate Conversion
# ==================================================

def to_three(x, y, w, h):
    return [
        round((x - w/2)*WORLD_SCALE, 4),
        round((h/2 - y)*WORLD_SCALE, 4),
        0
    ]


# ==================================================
# Smooth Curve Reconstruction
# ==================================================

def smooth_contour(cnt, w, h):

    pts = cnt[:, 0, :]

    if len(pts) < 10:
        return None

    x = pts[:,0]
    y = pts[:,1]

    try:
        # periodic spline keeps curves smooth
        tck, _ = splprep([x, y], s=3.0, per=True)

        u_new = np.linspace(0, 1, CURVE_POINTS)
        x_new, y_new = splev(u_new, tck)

    except:
        return None

    result = []
    for xi, yi in zip(x_new, y_new):
        result.append([
            round((xi - w/2)*WORLD_SCALE,4),
            round((h/2 - yi)*WORLD_SCALE,4)
        ])

    return result


# ==================================================
# Load Image
# ==================================================

img = cv2.imread(IMAGE_PATH)
if img is None:
    raise Exception("Image not found")

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
h, w = gray.shape


# ==================================================
# STEP 1 — Robust Line Detection
# ==================================================

# adaptive threshold handles uneven lines
binary = cv2.adaptiveThreshold(
    gray,
    255,
    cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv2.THRESH_BINARY_INV,
    31,
    3
)

# remove noise
kernel = np.ones((2,2), np.uint8)
binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

# strengthen thin lines
binary = cv2.dilate(binary, kernel, iterations=1)


# ==================================================
# STEP 2 — Skeleton (preserves thin structures)
# ==================================================

skel = skeletonize(binary // 255)
skel = (skel * 255).astype(np.uint8)

# reconnect slightly
skel = cv2.dilate(skel, kernel, iterations=1)


# ==================================================
# STEP 3 — Distance Transform Separation
# ==================================================

dist = cv2.distanceTransform(skel, cv2.DIST_L2, 5)

_, sure_fg = cv2.threshold(
    dist,
    0.25 * dist.max(),
    255,
    0
)

sure_fg = np.uint8(sure_fg)
sure_bg = cv2.dilate(skel, kernel, iterations=3)

unknown = cv2.subtract(sure_bg, sure_fg)


# ==================================================
# STEP 4 — Watershed Segmentation
# ==================================================

_, markers = cv2.connectedComponents(sure_fg)
markers = markers + 1
markers[unknown == 255] = 0

markers = cv2.watershed(img, markers)


# ==================================================
# STEP 5 — Extract Components
# ==================================================

components = []
placements = []
comp_index = 0

for label in np.unique(markers):

    if label <= 1:
        continue

    mask = np.zeros(gray.shape, dtype="uint8")
    mask[markers == label] = 255

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_NONE
    )

    for cnt in contours:

        area = cv2.contourArea(cnt)
        if area < MIN_AREA:
            continue

        polygon = smooth_contour(cnt, w, h)
        if polygon is None:
            continue

        M = cv2.moments(cnt)
        cx = int(M["m10"]/(M["m00"]+1e-5))
        cy = int(M["m01"]/(M["m00"]+1e-5))

        comp_id = f"component_{comp_index}"

        components.append({
            "id": comp_id,
            "type": "polygon",
            "points": polygon,
            "depth": 0.35,
            "material": "metal"
        })

        placements.append({
            "component": comp_id,
            "centroid": to_three(cx, cy, w, h)
        })

        comp_index += 1


# ==================================================
# SAVE JSON
# ==================================================

with open("components.json","w") as f:
    json.dump({"components": components}, f, indent=2)

with open("layout.json","w") as f:
    json.dump({"placements": placements}, f, indent=2)

print("✅ Components:", len(components))
print("✅ Layout generated")