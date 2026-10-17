#!/usr/bin/env python3
"""
Single source of truth for the SHOPDIGO logo.

Reproduces the approved "S-tag" logo (see brand/logo-reference.png) as vector geometry:
  - blue and yellow shopping tags forming an S, separated by an S-shaped cut-out, with tag holes
  - "SHOPDIGO" wordmark (SHOP in navy, DIGO in blue), outlined from Montserrat Medium
  - tagline "SHOP MORE • LIVE BETTER", outlined from the same font

Outputs:
  brand/shopdigo-mark.svg              symbol only
  brand/shopdigo-logo-stacked.svg      symbol + wordmark + tagline (auth pages, splash, hero)
  brand/shopdigo-logo-horizontal.svg   symbol + wordmark (header, footer)
  public/favicon.svg                   symbol on a transparent background
  src/components/brand/geometry.ts     the same geometry for the React components

Run:  python3 tools/build_logo.py
"""
import json
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = '/usr/lib/R/library/grDevices/fonts/Montserrat/static/Montserrat-Medium.ttf'

BLUE = '#2563EB'
NAVY = '#101828'
YELLOW = '#FBBF24'

# ───────── Symbol geometry (local units, origin top-left, ~460 x 530) ─────────
# Traced from the approved reference: 1254px image, mark box approx x 405–850, y 240–760,
# translated so the top-left of the mark is at (0, 0).
BLUE_TAG = (
    'M160 8 L400 68 Q426 76 422 99 Q420 109 408 121 L342 186 Q332 195 318 190 '
    'L240 165 Q200 157 190 185 L220 305 L160 333 Q130 339 100 320 L55 290 '
    'Q10 255 5 210 Q2 185 30 158 Z'
)
YELLOW_TAG = (
    'M300 205 L360 221 Q440 255 448 313 Q450 365 400 410 L290 500 Q250 530 205 522 '
    'L62 483 Q32 471 32 445 Q34 427 52 411 L140 340 Q200 325 280 325 Z'
)
HOLES = [(360, 98, 20), (103, 438, 20)]
# The S-shaped channel that separates the two tags (rendered as a mask cut-out, so it is transparent on any background).
S_CUT = 'M300 170 C230 150 160 180 175 225 C188 262 300 262 318 300 C332 340 290 368 230 352'
S_CUT_WIDTH = 40
MARK_BOX = (0, 0, 460, 530)


def font_path_builder():
    font = TTFont(FONT)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    cap = font['OS/2'].sCapHeight
    hmtx = font['hmtx']

    def fmt(v):
        s = f'{v:.2f}'.rstrip('0').rstrip('.')
        return '0' if s in ('-0', '') else s

    def text(s, x0, baseline, cap_height, tracking=0.0):
        """Returns (path_d, end_x) for text whose capitals are cap_height tall, placed at (x0, baseline)."""
        scale = cap_height / cap
        pen = SVGPathPen(gs, ntos=fmt)
        x = x0
        for ch in s:
            if ch == ' ':
                x += hmtx['space'][0] * scale + tracking * cap_height
                continue
            gname = cmap[ord(ch)]
            gs[gname].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
            x += hmtx[gname][0] * scale + tracking * cap_height
        return pen.getCommands(), x

    def width_of(s, cap_height, tracking=0.0):
        _, end = text(s, 0, 0, cap_height, tracking)
        return end

    return text, width_of


text, width_of = font_path_builder()

# Wordmark stroke adds weight to the Medium cut so it reads close to the reference's bold letters.
WORD_STROKE = 12.0
TAG_STROKE = 0.0


def build():
    out = {}

    # ── Wordmark (lockup units: cap height 150) ──
    W_CAP = 122.0
    shop_w = width_of('SHOP', W_CAP, tracking=0.01)
    digo_w = width_of('DIGO', W_CAP, tracking=0.01)
    word_gap = 0.0
    word_total = shop_w + word_gap + digo_w
    shop_d, _ = text('SHOP', 0, 0, W_CAP, tracking=0.01)
    digo_d, _ = text('DIGO', shop_w + word_gap, 0, W_CAP, tracking=0.01)
    out['wordmark'] = {
        'capHeight': W_CAP,
        'width': round(word_total, 2),
        'shop': shop_d,
        'digo': digo_d,
        'stroke': WORD_STROKE,
    }

    # ── Tagline (cap height 34) ──
    T_CAP = 34.0
    tag_text_left = 'SHOP MORE'
    tag_text_right = 'LIVE BETTER'
    gap_dot = 0.9 * T_CAP
    left_w = width_of(tag_text_left, T_CAP, tracking=0.32)
    right_w = width_of(tag_text_right, T_CAP, tracking=0.32)
    tag_total = left_w + gap_dot + 0.5 * T_CAP + gap_dot + right_w
    left_d, _ = text(tag_text_left, 0, 0, T_CAP, tracking=0.32)
    right_x = left_w + gap_dot + 0.5 * T_CAP + gap_dot
    right_d, _ = text(tag_text_right, right_x, 0, T_CAP, tracking=0.32)
    dot_cx = left_w + gap_dot + 0.25 * T_CAP
    out['tagline'] = {
        'capHeight': T_CAP,
        'width': round(tag_total, 2),
        'left': left_d,
        'right': right_d,
        'dot': {'cx': round(dot_cx, 2), 'cy': round(-T_CAP / 2, 2), 'r': round(T_CAP * 0.18, 2)},
    }

    out['mark'] = {
        'viewBox': MARK_BOX,
        'blue': BLUE_TAG,
        'yellow': YELLOW_TAG,
        'holes': [{'cx': a, 'cy': b, 'r': c} for a, b, c in HOLES],
        'cut': S_CUT,
        'cutWidth': S_CUT_WIDTH,
    }

    # ── Layout (stacked lockup, canvas 1000 wide) ──
    MS = 0.82  # mark scale in the stacked lockup
    mark_w, mark_h = MARK_BOX[2] * MS, MARK_BOX[3] * MS
    S_W = int(max(1000, round(word_total + 120)))
    S_H = 760
    stacked = {
        'width': S_W, 'height': S_H,
        'markScale': MS,
        'markX': round((S_W - mark_w) / 2, 2),
        'markY': 30,
        'wordX': round((S_W - word_total) / 2, 2),
        'wordBaseline': round(30 + mark_h + 60 + W_CAP, 2),
        'tagX': round((S_W - tag_total) / 2, 2),
        'tagBaseline': round(30 + mark_h + 60 + W_CAP + 96, 2),
    }
    stacked['height'] = round(stacked['tagBaseline'] + 40, 2)

    # Horizontal lockup: mark height 120, wordmark cap 66
    HS = 120.0 / MARK_BOX[3]
    H_CAP = 66.0
    h_word_w = word_total * (H_CAP / W_CAP)
    h_mark_w = MARK_BOX[2] * HS
    H_H = 120.0
    horizontal = {
        'width': round(h_mark_w + 26 + h_word_w, 2),
        'height': H_H,
        'markScale': round(HS, 6),
        'markX': 0,
        'markY': 0,
        'wordX': round(h_mark_w + 26, 2),
        'wordBaseline': round(H_H / 2 + H_CAP / 2, 2),
        'wordScale': round(H_CAP / W_CAP, 6),
    }

    out['layout'] = {'stacked': stacked, 'horizontal': horizontal}
    out['palette'] = {'blue': BLUE, 'navy': NAVY, 'yellow': YELLOW}
    return out


def svg_mark(uid, body_only=False):
    m = build()['mark']
    holes = ''.join(f'<circle cx="{h["cx"]}" cy="{h["cy"]}" r="{h["r"]}" fill="#000"/>' for h in m['holes'])
    defs = (
        f'<defs>'
        f'<linearGradient id="{uid}-blue" x1="160" y1="8" x2="60" y2="330" gradientUnits="userSpaceOnUse">'
        f'<stop offset="0" stop-color="#3B82F6"/><stop offset="0.55" stop-color="{BLUE}"/><stop offset="1" stop-color="#1E40AF"/></linearGradient>'
        f'<linearGradient id="{uid}-yellow" x1="300" y1="205" x2="250" y2="520" gradientUnits="userSpaceOnUse">'
        f'<stop offset="0" stop-color="#FDE68A"/><stop offset="0.6" stop-color="{YELLOW}"/><stop offset="1" stop-color="#F59E0B"/></linearGradient>'
        f'<mask id="{uid}-cut" maskUnits="userSpaceOnUse" x="-40" y="-40" width="540" height="620">'
        f'<rect x="-40" y="-40" width="540" height="620" fill="#fff"/>'
        f'<path d="{m["cut"]}" fill="none" stroke="#000" stroke-width="{m["cutWidth"]}" stroke-linecap="round"/>'
        f'{holes}</mask></defs>'
    )
    group = (
        f'<g mask="url(#{uid}-cut)">'
        f'<path d="{m["blue"]}" fill="url(#{uid}-blue)"/>'
        f'<path d="{m["yellow"]}" fill="url(#{uid}-yellow)"/>'
        f'</g>'
    )
    return defs + group


def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content)
    print('wrote', path)


def main():
    g = build()
    m, w, t, L = g['mark'], g['wordmark'], g['tagline'], g['layout']

    # Mark only
    write('brand/shopdigo-mark.svg',
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {m["viewBox"][2]} {m["viewBox"][3]}" role="img" aria-label="SHOPDIGO">'
          f'<title>SHOPDIGO</title>{svg_mark("mark")}</svg>\n')

    # Favicon: same mark, tight padding, transparent background
    write('public/favicon.svg',
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 472 542" role="img" aria-label="SHOPDIGO">'
          f'{svg_mark("fav")}</svg>\n')

    # Stacked lockup
    s = L['stacked']
    stacked = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s["width"]} {s["height"]}" role="img" aria-label="SHOPDIGO – Shop more, live better">'
        f'<title>SHOPDIGO – Shop more, live better</title>'
        f'<g transform="translate({s["markX"]} {s["markY"]}) scale({s["markScale"]})">'
        f'{svg_mark("stk")}</g>'
        f'<g transform="translate({s["wordX"]} {s["wordBaseline"]})">'
        f'<path d="{w["shop"]}" fill="{NAVY}" stroke="{NAVY}" stroke-width="{w["stroke"]}" stroke-linejoin="round"/>'
        f'<path d="{w["digo"]}" fill="{BLUE}" stroke="{BLUE}" stroke-width="{w["stroke"]}" stroke-linejoin="round"/>'
        f'</g>'
        f'<g transform="translate({s["tagX"]} {s["tagBaseline"]})" fill="{NAVY}">'
        f'<path d="{t["left"]}"/>'
        f'<path d="{t["right"]}"/>'
        f'<circle cx="{t["dot"]["cx"]}" cy="{t["dot"]["cy"]}" r="{t["dot"]["r"]}" fill="{YELLOW}"/>'
        f'</g></svg>\n'
    )
    write('brand/shopdigo-logo-stacked.svg', stacked)

    # Horizontal lockup
    h = L['horizontal']
    horizontal = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {h["width"]} {h["height"]}" role="img" aria-label="SHOPDIGO">'
        f'<title>SHOPDIGO</title>'
        f'<g transform="scale({h["markScale"]})">{svg_mark("hor")}</g>'
        f'<g transform="translate({h["wordX"]} {h["wordBaseline"]}) scale({h["wordScale"]})">'
        f'<path d="{w["shop"]}" fill="{NAVY}" stroke="{NAVY}" stroke-width="{w["stroke"]}" stroke-linejoin="round"/>'
        f'<path d="{w["digo"]}" fill="{BLUE}" stroke="{BLUE}" stroke-width="{w["stroke"]}" stroke-linejoin="round"/>'
        f'</g></svg>\n'
    )
    write('brand/shopdigo-logo-horizontal.svg', horizontal)

    # Geometry for the React components (same numbers as the static files)
    ts = (
        '/* Generated by tools/build_logo.py. Do not edit by hand. */\n'
        f'export const PALETTE = {json.dumps(g["palette"])} as const;\n'
        f'export const MARK = {json.dumps(m)} as const;\n'
        f'export const WORDMARK = {json.dumps(w)} as const;\n'
        f'export const TAGLINE = {json.dumps(t)} as const;\n'
        f'export const LAYOUT = {json.dumps(L)} as const;\n'
    )
    write('src/components/brand/geometry.ts', ts)


if __name__ == '__main__':
    main()
