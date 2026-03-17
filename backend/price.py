"""
price.py  ─  Flask Blueprint: jewelry price estimation
────────────────────────────────────────────────────────
Register in app.py:
    from price import price_bp
    app.register_blueprint(price_bp, url_prefix="/api/price")

POST /api/price/estimate  →  per-component breakdown + grand total
GET  /api/price/rates     →  reference rate sheet
"""

import math
import datetime
from flask import Blueprint, request, jsonify

price_bp = Blueprint("price", __name__)

# ─────────────────────────────────────────────────────────────────────────────
#  REFERENCE PRICE TABLE  (INR, Mumbai 17 Mar 2026)
# ─────────────────────────────────────────────────────────────────────────────

# Pure-metal base prices (₹ per gram of 100% pure metal)
METAL_BASE = {
    "gold":     {"label": "Gold",     "ppg": 9770,  "density": 19.32,
                 "source": "IBJA Mumbai (17 Mar 2026)"},
    "silver":   {"label": "Silver",   "ppg": 105,   "density": 10.49,
                 "source": "MCX India (17 Mar 2026)"},
    "copper":   {"label": "Copper",   "ppg": 0.90,  "density": 8.96,
                 "source": "LME / MCX India (17 Mar 2026)"},
    "platinum": {"label": "Platinum", "ppg": 3200,  "density": 21.45,
                 "source": "GoodReturns Mumbai (17 Mar 2026)"},
}

# karatId → { family, label, purity }
KARAT_MAP = {
    "gold_24k":      {"family": "gold",     "label": "24K",        "purity": 1.000},
    "gold_22k":      {"family": "gold",     "label": "22K",        "purity": 0.917},
    "gold_18k":      {"family": "gold",     "label": "18K",        "purity": 0.750},
    "gold_14k":      {"family": "gold",     "label": "14K",        "purity": 0.585},
    "silver_999":    {"family": "silver",   "label": "999",        "purity": 0.999},
    "silver_925":    {"family": "silver",   "label": "Sterling 925","purity": 0.925},
    "silver_800":    {"family": "silver",   "label": "800",        "purity": 0.800},
    "copper_pure":   {"family": "copper",   "label": "Pure",       "purity": 0.999},
    "copper_rose":   {"family": "copper",   "label": "Rose Alloy", "purity": 0.750},
    "platinum_950":  {"family": "platinum", "label": "Pt 950",     "purity": 0.950},
    "platinum_900":  {"family": "platinum", "label": "Pt 900",     "purity": 0.900},
    # legacy aliases
    "yellow_gold":   {"family": "gold",     "label": "22K Yellow", "purity": 0.917},
    "rose_gold":     {"family": "gold",     "label": "22K Rose",   "purity": 0.917},
    "white_gold":    {"family": "gold",     "label": "18K White",  "purity": 0.750},
    "platinum":      {"family": "platinum", "label": "Pt 950",     "purity": 0.950},
}

# Gemstone base price per carat (₹)
GEM_BASE = {
    "diamond":  {"label": "Diamond",       "ppc": 475000, "min": 350000, "max": 600000,
                 "source": "PriceScope · RH Jewellers India"},
    "ruby":     {"label": "Ruby",          "ppc": 95000,  "min": 40000,  "max": 250000,
                 "source": "Gemval · IndiaMART"},
    "sapphire": {"label": "Blue Sapphire", "ppc": 65000,  "min": 25000,  "max": 180000,
                 "source": "Gemval · IndiaMART"},
    "emerald":  {"label": "Emerald",       "ppc": 72000,  "min": 30000,  "max": 200000,
                 "source": "Gemval · IndiaMART"},
    "amethyst": {"label": "Amethyst",      "ppc": 1200,   "min": 400,    "max": 4000,
                 "source": "Gemval · IndiaMART"},
    "topaz":    {"label": "Blue Topaz",    "ppc": 1600,   "min": 500,    "max": 5000,
                 "source": "Gemval · IndiaMART"},
    "opal":     {"label": "Opal",          "ppc": 12000,  "min": 3000,   "max": 40000,
                 "source": "Gemval · IndiaMART"},
    "pearl":    {"label": "Pearl",         "ppc": 10000,  "min": 2000,   "max": 30000,
                 "source": "Gemval · IndiaMART"},
}

# Diamond cut multiplier relative to round brilliant
CUT_MULT = {
    "round_brilliant": 1.000,
    "princess":        0.863,
    "oval":            0.884,
    "emerald_cut":     0.811,
    "cushion":         0.821,
    "pear":            0.853,
}

# Diamond colour multiplier (Fancy colour premium)
COLOR_MULT = {
    "diamond_white":  1.00,   # D–F colourless — base
    "diamond_yellow": 1.15,   # Fancy yellow
    "diamond_rose":   2.40,   # Fancy pink (Argyle-style)
    "diamond_red":    5.00,   # Fancy red — extremely rare
}

# Making / labour charges (₹ flat per component)
MAKING = {
    "band": 3500, "ring": 3500, "shank": 3500,
    "prong": 1500, "prongs": 1500,
    "setting": 1800, "basket": 1800, "bezel": 1800,
    "halo": 2500,
    # gem component types
    "gem": 2200, "gemstone": 2200,
    "center_stone": 2200, "center stone": 2200,
    "stone": 2200,
    # "diamond" as a component TYPE (not gem type) → treated as gem
    "diamond": 2200,
    "_default": 1200,
}

CARAT_MAP = {
    "0.25ct": 0.25, "0.5ct": 0.50, "0.75ct": 0.75,
    "1ct":    1.00, "1.5ct": 1.50, "2ct":    2.00, "3ct": 3.00,
}

# Component types that are METAL structures
METAL_COMPONENT_TYPES = {
    "band", "ring", "shank",
    "prong", "prongs",
    "setting", "basket", "bezel",
    "halo",
}

# Component types that are GEM / stone structures
GEM_COMPONENT_TYPES = {
    "gem", "gemstone", "stone",
    "center_stone", "center stone",
    "diamond",      # ← component whose TYPE is "diamond"
    "ruby", "sapphire", "emerald",
    "amethyst", "topaz", "opal", "pearl",
}


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _fmt(n: float) -> str:
    """Format a number as an INR string."""
    n = int(round(n))
    if n >= 10_000_000:
        return f"₹{n / 10_000_000:.2f} Cr"
    if n >= 100_000:
        return f"₹{n / 100_000:.2f} L"
    return f"₹{n:,}"


def _is_metal(ctype: str) -> bool:
    return ctype in METAL_COMPONENT_TYPES


def _is_gem(ctype: str) -> bool:
    return ctype in GEM_COMPONENT_TYPES


def _band_weight(band_width_mm: float, karat_id: str) -> float:
    """
    Ring torus weight:  mass = (2π²·R·r²) / 1000  × density
    R = inner ring radius 9.5 mm (size 7),  r = tube radius
    Returns grams.
    """
    k       = KARAT_MAP.get(karat_id) or KARAT_MAP["gold_22k"]
    density = METAL_BASE[k["family"]]["density"]
    ring_r  = 9.5
    tube_r  = (band_width_mm / 2.0) * 0.85
    vol     = 2.0 * math.pi ** 2 * ring_r * tube_r ** 2   # mm³
    return round(vol / 1000.0 * density, 2)                # → grams


# ─────────────────────────────────────────────────────────────────────────────
#  Core pricing logic for one component
# ─────────────────────────────────────────────────────────────────────────────

def _price_component(raw: dict) -> dict:
    """
    Price a single component dict received from the frontend.

    Expected shape:
    {
        "id":   "band_1",
        "name": "Main Band",
        "type": "band",                          ← component type
        "materialOverrides": {
            "metalType":    "gold_22k",          ← karat id  (metal comps)
            "gemType":      "diamond",           ← gem variety (gem comps)
            "diamondColor": "diamond_white"      ← colour id (diamonds only)
        },
        "geometry": {
            "bandWidth":  2.5,                   ← mm  (metal comps)
            "caratSize":  "1ct",                 ← string key (gem comps)
            "cut":        "round_brilliant"      ← cut id (gem comps)
        }
    }
    """
    ctype = (raw.get("type") or "band").lower().strip()
    ov    = raw.get("materialOverrides") or {}
    geo   = raw.get("geometry") or {}

    # ── Read inputs ──────────────────────────────────────────────────────────
    karat_id     = (ov.get("metalType")    or "gold_22k").strip()
    gem_type     = (ov.get("gemType")      or "diamond").strip().lower()
    diamond_color= (ov.get("diamondColor") or "diamond_white").strip()
    carat_str    = (geo.get("caratSize")   or "1ct").strip()
    cut_id       = (geo.get("cut")         or "round_brilliant").strip()
    band_w       = float(geo.get("bandWidth") or 2.5)

    breakdown      = []
    total          = 0.0
    weight_grams   = 0.0
    price_per_gram = 0.0
    material_label = ctype

    # ── Metal cost ───────────────────────────────────────────────────────────
    if _is_metal(ctype):
        k      = KARAT_MAP.get(karat_id) or KARAT_MAP["gold_22k"]
        family = k["family"]
        purity = k["purity"]
        metal  = METAL_BASE[family]

        price_per_gram = round(metal["ppg"] * purity)
        weight_grams   = _band_weight(band_w, karat_id)
        metal_cost     = round(weight_grams * price_per_gram)
        material_label = f"{metal['label']} {k['label']}"

        breakdown.append({
            "label":       f"{metal['label']} {k['label']}",
            "sub":         f"{weight_grams:.2f}g × {_fmt(price_per_gram)}/g",
            "amount_inr":  metal_cost,
            "formatted":   _fmt(metal_cost),
            "source":      metal["source"],
            "line_type":   "metal",
        })
        total += metal_cost

    # ── Gem cost ─────────────────────────────────────────────────────────────
    if _is_gem(ctype):
        # When component type is e.g. "diamond" use that as gem_type directly,
        # unless materialOverrides.gemType overrides it
        resolved_gem = gem_type if gem_type in GEM_BASE else ctype if ctype in GEM_BASE else "diamond"
        gem          = GEM_BASE.get(resolved_gem) or GEM_BASE["diamond"]

        carats  = CARAT_MAP.get(carat_str) or 1.0
        base_pc = gem["ppc"]

        if resolved_gem == "diamond":
            cut_m   = CUT_MULT.get(cut_id)   or 1.0
            col_m   = COLOR_MULT.get(diamond_color) or 1.0
            final_pc = round(base_pc * cut_m * col_m)
        else:
            final_pc = base_pc

        gem_cost  = round(carats * final_pc)
        range_txt = f"Range: {_fmt(gem['min'] * carats)} – {_fmt(gem['max'] * carats)}"
        material_label = f"{gem['label']} {carat_str}"

        # Build detail sub-text
        if resolved_gem == "diamond":
            col_label = {
                "diamond_white":  "White/D–F",
                "diamond_yellow": "Fancy Yellow",
                "diamond_rose":   "Fancy Rose",
                "diamond_red":    "Fancy Red",
            }.get(diamond_color, diamond_color)
            sub = (f"{_fmt(final_pc)}/ct · "
                   f"{cut_id.replace('_', ' ').title()} cut · {col_label}")
        else:
            sub = f"{_fmt(final_pc)}/ct"

        breakdown.append({
            "label":      f"{gem['label']} {carat_str}",
            "sub":        sub,
            "amount_inr": gem_cost,
            "formatted":  _fmt(gem_cost),
            "range":      range_txt,
            "source":     gem["source"],
            "line_type":  "gem",
        })
        total += gem_cost

    # ── Making / labour charges ──────────────────────────────────────────────
    making = MAKING.get(ctype) or MAKING["_default"]
    breakdown.append({
        "label":      "Making charges",
        "sub":        "Labour & setting fee",
        "amount_inr": making,
        "formatted":  _fmt(making),
        "source":     "",
        "line_type":  "making",
    })
    total += making

    return {
        "id":             raw.get("id") or "unknown",
        "name":           raw.get("name") or raw.get("id") or ctype,
        "type":           ctype,
        "material_label": material_label,
        "breakdown":      breakdown,
        "total_inr":      round(total),
        "total_formatted":_fmt(total),
        "weight_grams":   weight_grams,
        "price_per_gram": price_per_gram,
        "is_gem":         _is_gem(ctype),
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Route  POST /api/price/estimate
# ─────────────────────────────────────────────────────────────────────────────
@price_bp.route("/estimate", methods=["POST"])
def estimate():
    """
    Request JSON:
    {
        "model_id": "ring_001",
        "components": [
            {
                "id":   "band_1",
                "name": "Main Band",
                "type": "band",
                "materialOverrides": { "metalType": "silver_925" },
                "geometry": { "bandWidth": 3.0 }
            },
            {
                "id":   "gem_1",
                "name": "Center Diamond",
                "type": "diamond",
                "materialOverrides": {
                    "gemType":      "diamond",
                    "diamondColor": "diamond_rose"
                },
                "geometry": { "caratSize": "1.5ct", "cut": "oval" }
            }
        ]
    }

    Response JSON:
    {
        "model_id": "ring_001",
        "components": [
            {
                "id": "band_1",
                "name": "Main Band",
                "type": "band",
                "material_label": "Silver Sterling 925",
                "breakdown": [
                    { "label": "Silver Sterling 925", "sub": "3.12g × ₹97/g",
                      "amount_inr": 303, "formatted": "₹303",
                      "source": "MCX India ...", "line_type": "metal" },
                    { "label": "Making charges", "sub": "Labour & setting fee",
                      "amount_inr": 3500, "formatted": "₹3,500",
                      "source": "", "line_type": "making" }
                ],
                "total_inr": 3803,
                "total_formatted": "₹3,803",
                "weight_grams": 3.12,
                "price_per_gram": 97,
                "is_gem": false
            },
            {
                "id": "gem_1",
                "name": "Center Diamond",
                "type": "diamond",
                "material_label": "Diamond 1.5ct",
                "breakdown": [
                    { "label": "Diamond 1.5ct",
                      "sub": "₹10,00,800/ct · Oval cut · Fancy Rose",
                      "amount_inr": 15012000, "formatted": "₹1.50 Cr",
                      "range": "Range: ₹5.25 L – ₹9.00 L",
                      "source": "PriceScope ...", "line_type": "gem" },
                    { "label": "Making charges", "sub": "Labour & setting fee",
                      "amount_inr": 2200, "formatted": "₹2,200",
                      "source": "", "line_type": "making" }
                ],
                "total_inr": 15014200,
                "total_formatted": "₹1.50 Cr",
                "weight_grams": 0.0,
                "price_per_gram": 0,
                "is_gem": true
            }
        ],
        "grand_total_inr": 15018003,
        "grand_total_formatted": "₹1.50 Cr",
        "total_weight_grams": 3.12,
        "blended_price_per_gram": 97,
        "currency": "INR",
        "source": "PRICE_TABLE reference · Mumbai 17 Mar 2026",
        "calculated_at": "2026-03-17T..."
    }
    """
    body = request.get_json(force=True, silent=True)
    if not body:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    raw_components = body.get("components")
    if not isinstance(raw_components, list) or len(raw_components) == 0:
        return jsonify({"error": "'components' must be a non-empty array"}), 400

    model_id = str(body.get("model_id") or "unknown")
    results  = [_price_component(c) for c in raw_components]

    grand_total  = sum(r["total_inr"]    for r in results)
    total_weight = sum(r["weight_grams"] for r in results)

    # Blended ₹/g = pure metal spend ÷ total metal weight
    metal_spend = sum(
        next((ln["amount_inr"] for ln in r["breakdown"] if ln["line_type"] == "metal"), 0)
        for r in results if not r["is_gem"] and r["weight_grams"] > 0
    )
    blended_ppg = round(metal_spend / total_weight) if total_weight > 0 else 0

    return jsonify({
        "model_id":               model_id,
        "components":             results,
        "grand_total_inr":        round(grand_total),
        "grand_total_formatted":  _fmt(grand_total),
        "total_weight_grams":     round(total_weight, 2),
        "blended_price_per_gram": blended_ppg,
        "currency":               "INR",
        "source":                 "PRICE_TABLE reference · Mumbai 17 Mar 2026",
        "calculated_at":          datetime.datetime.utcnow().isoformat() + "Z",
    })


# ─────────────────────────────────────────────────────────────────────────────
#  Route  GET /api/price/rates  (reference sheet / debug)
# ─────────────────────────────────────────────────────────────────────────────
@price_bp.route("/rates", methods=["GET"])
def rates():
    return jsonify({
        "metals": {
            fam: {
                "label":          d["label"],
                "price_per_gram": d["ppg"],
                "density":        d["density"],
                "source":         d["source"],
                "karats": {
                    kid: {
                        "label":           k["label"],
                        "purity":          k["purity"],
                        "effective_ppg":   round(d["ppg"] * k["purity"]),
                    }
                    for kid, k in KARAT_MAP.items()
                    if k["family"] == fam
                    and kid not in ("yellow_gold", "rose_gold", "white_gold", "platinum")
                },
            }
            for fam, d in METAL_BASE.items()
        },
        "gems": {
            gtype: {
                "label":    g["label"],
                "ppc":      g["ppc"],
                "min":      g["min"],
                "max":      g["max"],
                "source":   g["source"],
            }
            for gtype, g in GEM_BASE.items()
        },
        "diamond_cut_multipliers":   CUT_MULT,
        "diamond_color_multipliers": COLOR_MULT,
        "currency": "INR",
        "as_of":    "17 Mar 2026",
    })