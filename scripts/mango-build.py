#!/usr/bin/env python3
"""Mango cycle build: aligns the art and writes the stage SVG + constants.

Reads the parts in src/sections/08-mango-cycle-gsap/assets/parts/ and writes
  src/sections/08-mango-cycle-gsap/stage.svg       the inline stage
  src/sections/08-mango-cycle-gsap/constants.json  cameras, timings, morph data

Re-run it after the art changes:
  python3 -m pip install scikit-image svgelements   (once)
  python3 scripts/mango-build.py [--debug]

World units are ref-sprout.svg units. The seed, roots and sprout sit where
they are in ref-sprout.svg; tree.svg is drawn 2.4x larger with its trunk
base on the ground point, the place where the roots leave the seed. Alignment offsets were found by matching
path points and confirmed by pixel diff; see notes.md.
"""
from __future__ import annotations

import heapq
import json
import math
import re
import sys
from pathlib import Path as FsPath

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage.morphology import skeletonize
from svgelements import Matrix, Path

ROOT = FsPath(__file__).resolve().parent.parent
SECTION = ROOT / 'src/sections/08-mango-cycle-gsap'
PARTS = SECTION / 'assets/parts'
DEBUG = '--debug' in sys.argv

# ---------------------------------------------------------------- art

def path_data(name: str) -> list[str]:
    return re.findall(r'\sd="([^"]+)"', (PARTS / name).read_text())


def subpaths(d: str) -> list[str]:
    """Split a compound path into its subpaths, dropping zero-size ones."""
    out = []
    for s in re.split(r'(?=[Mm])', d):
        if not s.strip():
            continue
        x0, y0, x1, y1 = Path(s).bbox()
        if x1 - x0 > 0.5 and y1 - y0 > 0.5:
            out.append(s.strip())
    return out


SEED_D = path_data('seed.svg')[0]
ROOT_D = path_data('root.svg')[0]
SPROUT_D = path_data('sprout.svg')[0]
TREE_D, TREE_LEAF_LEFT_D, TREE_LEAF_RIGHT_D = path_data('tree.svg')
FRUIT_D = path_data('fruit.svg')[0]
FRUIT_LEAF_D = path_data('fruit-leaf.svg')[0]

SEED_OUTLINE, SEED_GROOVES = subpaths(SEED_D)  # outline, then one hole
FRUIT_OUTLINE, FRUIT_HIGHLIGHT = subpaths(FRUIT_D)

# ---------------------------------------------------------------- layout (world)

# Measured against the references (see the module docstring).
SEED_AT = (78.76, 219.16)
ROOT_AT = (0.0, 448.94)
SPROUT_AT = (166.39, 0.0)
# Ground point: where the roots leave the seed (root.svg's top, ~(110, 0)).
GROUND = (ROOT_AT[0] + 110.0, ROOT_AT[1] + 0.0)
# Trunk base in tree.svg units: centre of the trunk where the flares start.
TREE_BASE = (241.0, 525.0)
# The tree is drawn 2.4x larger than its own units, so it towers over the
# sprout and the camera's pull-back sells the growth.
TREE_SCALE = 2.4
TREE_AT = (GROUND[0] - TREE_BASE[0] * TREE_SCALE, GROUND[1] - TREE_BASE[1] * TREE_SCALE)
# fruit.svg fitted to the three fruits of ref-tree.svg (tree units):
# centre x, y, scale, rotation. The first is the hero (inside the ring).
FRUITS = [
    {'x': 251.0, 'y': 243.0, 's': 0.425, 'r': -8.0},
    {'x': 122.0, 'y': 335.0, 's': 0.435, 'r': -8.0},
    {'x': 370.5, 'y': 348.5, 's': 0.45, 'r': -15.0},
]
FRUIT_CENTRE = (106.5, 143.5)
FRUIT_STEM = (152.0, 4.0)
# ref-fruit.svg: fruit at (19.81, 67.28), leaf at (193.42, 32.72), so the leaf
# sits at their difference in fruit.svg units.
FRUIT_LEAF_AT = (193.42 - 19.81, 32.72 - 67.28)
FRUIT_LEAF_BASE = (4.0, 38.0)  # leaf.svg: the end that meets the stem
# The two loose top leaves of tree.svg and the point each grows from.
TREE_LEAVES = [
    {'d': TREE_LEAF_LEFT_D, 'pivot': (205.0, 158.0)},
    {'d': TREE_LEAF_RIGHT_D, 'pivot': (270.0, 155.0)},
]

STAGE = 1000.0  # square stage, viewBox 0 0 1000 1000


def fruit_matrix(f: dict) -> Matrix:
    """fruit.svg units -> tree units."""
    m = Matrix()
    m.post_translate(-FRUIT_CENTRE[0], -FRUIT_CENTRE[1])
    m.post_scale(f['s'])
    m.post_rotate(math.radians(f['r']))
    m.post_translate(f['x'], f['y'])
    return m


def translate(t) -> Matrix:
    m = Matrix()
    m.post_translate(t[0], t[1])
    return m


def bbox_of(d: str, m: Matrix | None = None):
    p = Path(d)
    if m is not None:
        p = p * m
    return p.bbox()


def union(*bbs):
    return (min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs))


# ---------------------------------------------------------------- centre lines

def raster(d: str, k: int):
    """Rasterise a filled compound path at k px per unit (even-odd)."""
    x0, y0, x1, y1 = Path(d).bbox()
    pad = 4
    w, h = int((x1 - x0) * k) + 2 * pad, int((y1 - y0) * k) + 2 * pad
    acc = np.zeros((h, w), bool)
    for s in subpaths(d):
        p = Path(s)
        n = max(200, int(p.length() * k / 1.5))
        pts = [p.point(i / n) for i in range(n + 1)]
        img = Image.new('1', (w, h), 0)
        ImageDraw.Draw(img).polygon([((q.x - x0) * k + pad, (q.y - y0) * k + pad) for q in pts], fill=1)
        acc ^= np.array(img, bool)
    to_units = lambda r, c: ((c - pad) / k + x0, (r - pad) / k + y0)
    return acc, to_units


NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0]), np.array(pts[-1])
    ab = b - a
    n = np.hypot(*ab) or 1e-9
    dists = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / n for p in pts[1:-1]]
    i = int(np.argmax(dists)) + 1
    if dists[i - 1] > eps:
        return rdp(pts[: i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]


def catmull_rom(pts) -> str:
    """Smooth polyline -> cubic Bezier path data."""
    if len(pts) == 2:
        (x0, y0), (x1, y1) = pts
        return f'M{x0:.1f} {y0:.1f}L{x1:.1f} {y1:.1f}'
    p = [pts[0]] + pts + [pts[-1]]
    out = [f'M{pts[0][0]:.1f} {pts[0][1]:.1f}']
    for i in range(1, len(p) - 2):
        (ax, ay), (bx, by), (cx, cy), (dx, dy) = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (bx + (cx - ax) / 6, by + (cy - ay) / 6)
        c2 = (cx - (dx - bx) / 6, cy - (dy - by) / 6)
        out.append(f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {cx:.1f} {cy:.1f}')
    return ''.join(out)


def centre_lines(d: str, start, k: int = 4, min_len: float = 6.0):
    """Branches of the shape's skeleton, grown from `start` (shape units).

    Returns [{d, start, length, width}], start = distance of the branch's
    junction from the growth start, all in shape units.
    """
    mask, to_units = raster(d, k)
    skel = skeletonize(mask)
    half = ndimage.distance_transform_edt(mask) / k  # half-width, units
    coords = np.argwhere(skel)
    index = {tuple(c): i for i, c in enumerate(coords)}
    # Start at the skeleton pixel nearest the requested start point.
    pts_u = np.array([to_units(r, c) for r, c in coords])
    s_idx = int(np.argmin(np.hypot(pts_u[:, 0] - start[0], pts_u[:, 1] - start[1])))
    # Dijkstra over the 8-connected skeleton: a shortest-path tree.
    dist = np.full(len(coords), np.inf)
    parent = np.full(len(coords), -1)
    dist[s_idx] = 0
    heap = [(0.0, s_idx)]
    while heap:
        dd, i = heapq.heappop(heap)
        if dd > dist[i]:
            continue
        r, c = coords[i]
        for dr, dc in NB:
            j = index.get((r + dr, c + dc))
            if j is None:
                continue
            nd = dd + math.hypot(dr, dc) / k
            if nd < dist[j]:
                dist[j], parent[j] = nd, i
                heapq.heappush(heap, (nd, j))
    reach = np.isfinite(dist)
    children = np.zeros(len(coords), int)
    for i in np.where(reach)[0]:
        if parent[i] >= 0:
            children[parent[i]] += 1
    tips = [i for i in np.where(reach)[0] if children[i] == 0 and i != s_idx]
    tips.sort(key=lambda i: -dist[i])
    claimed = np.zeros(len(coords), bool)
    claimed[s_idx] = True
    branches = []
    for t in tips:
        chain = [t]
        while not claimed[chain[-1]] and parent[chain[-1]] >= 0:
            chain.append(parent[chain[-1]])
        length = dist[t] - dist[chain[-1]]
        if length < min_len:
            continue  # skeleton spur
        for i in chain:
            claimed[i] = True
        chain.reverse()  # junction -> tip
        poly = [to_units(*coords[i]) for i in chain]
        poly = rdp(poly, 0.6)
        # Width: the widest point of the branch itself, skipping the part
        # still inside the parent (as far from the junction as it is wide).
        skip = half[tuple(coords[chain[0]])]
        own = [half[tuple(coords[i])] for i in chain if dist[i] - dist[chain[0]] >= skip] or [skip]
        w = 2 * max(own) + 3
        branches.append({'d': catmull_rom(poly), 'start': round(float(dist[chain[0]]), 2),
                         'length': round(float(length), 2), 'width': round(float(w), 1)})
    branches.sort(key=lambda b: b['start'])
    reach_pts = [(*to_units(*coords[i]), float(dist[i])) for i in np.where(reach)[0][::3]]
    return branches, reach_pts


def arrival(reach_pts, p) -> float:
    """Growth distance at which the skeleton reaches the point nearest p."""
    best = min(reach_pts, key=lambda q: (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2)
    return round(best[2], 2)


# ---------------------------------------------------------------- cameras

def camera(fx, fy, scale, rot=0.0) -> dict:
    return {'fx': round(fx, 3), 'fy': round(fy, 3), 's': round(scale, 5), 'r': round(rot, 3)}


def camera_matrix(c: dict) -> Matrix:
    """world -> stage: translate(cx cy) rotate(r) scale(s) translate(-fx -fy)."""
    m = Matrix()
    m.post_translate(-c['fx'], -c['fy'])
    m.post_scale(c['s'])
    m.post_rotate(math.radians(c['r']))
    m.post_translate(STAGE / 2, STAGE / 2)
    return m


def frame_bbox(bb, fill: float, rot=0.0) -> dict:
    x0, y0, x1, y1 = bb
    return camera((x0 + x1) / 2, (y0 + y1) / 2, fill * STAGE / max(y1 - y0, (x1 - x0) / 1.2), rot)


def fmt(x: float) -> str:
    return f'{x:.2f}'.rstrip('0').rstrip('.')


def transformed_d(d: str, m: Matrix) -> str:
    p = Path(d) * m
    p.reify()
    return p.d()


def build():
    tree_m = Matrix()
    tree_m.post_scale(TREE_SCALE)
    tree_m.post_translate(*TREE_AT)
    hero = FRUITS[0]
    hero_m = fruit_matrix(hero) * tree_m  # fruit.svg units -> world

    seed_bb = bbox_of(SEED_OUTLINE, translate(SEED_AT))
    sprout_bb = (0, 0, 402, 586)  # ref-sprout.svg
    tree_bb = bbox_of(TREE_D, tree_m)
    # Hero fruit + its leaf, measured upright (in fruit units), centred in world.
    leaf_bb = bbox_of(FRUIT_LEAF_D, translate(FRUIT_LEAF_AT))
    hl = union(bbox_of(FRUIT_D), leaf_bb)
    hc = hero_m.point_in_matrix_space(((hl[0] + hl[2]) / 2, (hl[1] + hl[3]) / 2))
    cams = {
        'seed': frame_bbox(seed_bb, 0.40),
        'sprout': frame_bbox(sprout_bb, 0.75),
        'tree': frame_bbox(tree_bb, 0.85),
        'mango': camera(hc[0], hc[1], 0.65 * STAGE / ((hl[3] - hl[1]) * hero['s'] * TREE_SCALE), -hero['r']),
    }

    # The loop morph: the seed outline carried into the hero fruit's own
    # units, so under the mango camera it lands where the seed sits under
    # the seed camera. target = inv(hero) . inv(cam_mango) . cam_seed . seedAt
    to_hero = translate(SEED_AT) * camera_matrix(cams['seed']) * ~camera_matrix(cams['mango']) * ~hero_m
    morph_outline = transformed_d(SEED_OUTLINE, to_hero)
    morph_grooves = transformed_d(SEED_GROOVES, to_hero)
    # Check: a seed point through both routes lands on the same stage point.
    q = Path(SEED_OUTLINE).point(0.3)
    a = (translate(SEED_AT) * camera_matrix(cams['seed'])).point_in_matrix_space(q)
    b = (to_hero * hero_m * camera_matrix(cams['mango'])).point_in_matrix_space(q)
    assert abs(a[0] - b[0]) < 1e-6 and abs(a[1] - b[1]) < 1e-6, (a, b)

    # Growth centre lines.
    roots, _ = centre_lines(ROOT_D, (110.0, 0.0))
    sprout, _ = centre_lines(SPROUT_D, (140.0, 237.0))
    tree, tree_reach = centre_lines(TREE_D, TREE_BASE)
    leaf_at = [arrival(tree_reach, l['pivot']) for l in TREE_LEAVES]

    def grow_mask(mid: str, shape_d: str, branches) -> str:
        x0, y0, x1, y1 = Path(shape_d).bbox()
        pad = 60
        box = f'x="{fmt(x0 - pad)}" y="{fmt(y0 - pad)}" width="{fmt(x1 - x0 + 2 * pad)}" height="{fmt(y1 - y0 + 2 * pad)}"'
        strokes = ''.join(
            f'<path class="mc-grow" d="{b["d"]}" stroke-width="{b["width"]}" data-start="{b["start"]}" data-length="{b["length"]}"/>'
            for b in branches
        )
        return (f'<mask id="{mid}" maskUnits="userSpaceOnUse" {box}>'
                f'<g fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round">{strokes}</g>'
                f'<rect class="mc-grow-fill" {box} fill="white"/></mask>')

    big = 'x="-3000" y="-3000" width="6000" height="6000"'
    defs = ''.join([
        grow_mask('mc-m-root', ROOT_D, roots),
        grow_mask('mc-m-sprout', SPROUT_D, sprout),
        grow_mask('mc-m-tree', TREE_D, tree),
        f'<mask id="mc-m-seed" maskUnits="userSpaceOnUse" {big}><rect {big} fill="white"/>'
        f'<path d="{SEED_GROOVES}" fill="black"/></mask>',
        f'<mask id="mc-m-hero" maskUnits="userSpaceOnUse" {big}><rect {big} fill="white"/>'
        f'<path id="mc-highlight" d="{FRUIT_HIGHLIGHT}" fill="black"/>'
        f'<path id="mc-grooves" d="{morph_grooves}" fill="black" opacity="0"/></mask>',
    ])

    def fruit_g(f: dict, inner: str, gid: str = '') -> str:
        m = fruit_matrix(f)
        return (f'<g transform="matrix({fmt(m.a)} {fmt(m.b)} {fmt(m.c)} {fmt(m.d)} {fmt(m.e)} {fmt(m.f)})">'
                f'<g class="mc-fruit"{gid}>{inner}</g></g>')

    t = lambda p: f'translate({fmt(p[0])} {fmt(p[1])})'
    leaves = ''.join(
        f'<g class="mc-tree-leaf" data-pivot="{fmt(l["pivot"][0])} {fmt(l["pivot"][1])}"><path d="{l["d"]}"/></g>'
        for l in TREE_LEAVES
    )
    side_fruits = ''.join(fruit_g(f, f'<path d="{FRUIT_D}"/>') for f in FRUITS[1:])
    hero_g = fruit_g(
        hero,
        f'<path id="mc-hero-outline" d="{FRUIT_OUTLINE}" mask="url(#mc-m-hero)"/>'
        f'<g transform="{t(FRUIT_LEAF_AT)}"><g id="mc-fruit-leaf"><path d="{FRUIT_LEAF_D}"/></g></g>',
        ' id="mc-hero"',
    )
    svg = (
        f'<svg class="mc__stage" viewBox="0 0 {int(STAGE)} {int(STAGE)}" aria-hidden="true">'
        f'<defs>{defs}</defs><g id="mc-camera">'
        # Stacking: roots and stem behind the seed, fruits above the tree.
        f'<g transform="{t(ROOT_AT)}"><path id="mc-root" d="{ROOT_D}" mask="url(#mc-m-root)"/></g>'
        f'<g transform="{t(SPROUT_AT)}"><g id="mc-sprout"><path d="{SPROUT_D}" mask="url(#mc-m-sprout)"/></g></g>'
        f'<g transform="{t(SEED_AT)}"><g id="mc-seed"><g id="mc-seed-wobble">'
        f'<path d="{SEED_OUTLINE}" mask="url(#mc-m-seed)"/></g></g></g>'
        f'<g transform="{t(TREE_AT)} scale({TREE_SCALE})"><g id="mc-tree-rest">'
        f'<path id="mc-tree" d="{TREE_D}" mask="url(#mc-m-tree)"/>{leaves}{side_fruits}</g>{hero_g}</g>'
        '</g></svg>'
    )
    (SECTION / 'stage.svg').write_text(svg + '\n')

    consts = {
        'stage': STAGE,
        'cameras': cams,
        'pivots': {
            'seedCentre': [round((seed_bb[0] + seed_bb[2]) / 2 - SEED_AT[0], 2), round((seed_bb[1] + seed_bb[3]) / 2 - SEED_AT[1], 2)],
            'groundInSprout': [round(GROUND[0] - SPROUT_AT[0], 2), round(GROUND[1] - SPROUT_AT[1], 2)],
            'groundInSeed': [round(GROUND[0] - SEED_AT[0], 2), round(GROUND[1] - SEED_AT[1], 2)],
            'fruitStem': list(FRUIT_STEM),
            'fruitLeafBase': list(FRUIT_LEAF_BASE),
        },
        'growth': {
            'root': max(b['start'] + b['length'] for b in roots),
            'sprout': max(b['start'] + b['length'] for b in sprout),
            'tree': max(b['start'] + b['length'] for b in tree),
            'treeLeaves': leaf_at,
        },
        'morph': {'outline': morph_outline},
    }
    (SECTION / 'constants.json').write_text(json.dumps(consts, indent=2) + '\n')
    kb = len(svg.encode()) / 1024
    print(f'stage.svg {kb:.1f} KB, root {len(roots)} / sprout {len(sprout)} / tree {len(tree)} branches')
    print(json.dumps(cams, indent=1))


if __name__ == '__main__':
    build()
