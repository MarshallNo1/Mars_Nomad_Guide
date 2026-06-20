#!/usr/bin/env python3
"""
Re-classify all places into the new 8-top-level category structure.

Top-level categories:
  - stay, work, food, wellness, nightlife, outdoor, entertainment, community

Wellness internal sub-grouping (rendered as h3 sub-blocks):
  - yoga, healing, mental

Other transforms:
  1. html.unescape() all name/desc strings to fix &amp; / &#039; etc.
  2. Strict yoga filter — kick non-yoga (sound healing / painting / live music) out
  3. Yoga cap to ~35 (keep 1 per venue, then by quality if still > 35)
"""
import json, html, re, collections, random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
random.seed(42)

# ---------- 1. Load all data ----------
files = {
    'bali':    ROOT / 'src/data/bali.json',
    'nomeo':   ROOT / 'src/data/nomeo-bali-events.json',
    'megatix': ROOT / 'src/data/megatix-bali-events.json',
}
data = {k: json.loads(p.read_text(encoding='utf-8')) for k, p in files.items()}

# ---------- 2. HTML entity cleanup (everywhere) ----------
def deep_unescape(obj):
    if isinstance(obj, str):
        return html.unescape(obj)
    if isinstance(obj, dict):
        return {k: deep_unescape(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [deep_unescape(x) for x in obj]
    return obj

for k in data:
    data[k] = deep_unescape(data[k])

# ---------- 3. Classifier rules (order matters: first match wins) ----------
# Returns (top_category, wellness_subcategory_or_None)

# strict yoga: title must look like an actual yoga class
YOGA_STRICT = re.compile(
    r'\b(yoga|vinyasa|hatha|yin|ashtanga|pilates|handstand|acro|inversion|flyhigh|asana|pranayama\s+(?:class|flow))\b',
    re.IGNORECASE
)
# title looks like a non-yoga event even if hosted at yoga studio
NOT_YOGA_OVERRIDE = re.compile(
    r'\b(puppy\s+painting|painting|paint\s+and\s+sip|sound\s+heal|sound\s+bath|live\s+music|comedy|improv|dj\s+set|kitchen\s+party|talks?|workshop\s+by\s+(?!almitra|free|ricardo))\b',
    re.IGNORECASE
)

HEALING_PAT = re.compile(
    r'\b(sound\s*heal|sound\s*bath|sound\s*journey|sound\s*temple|breath\s*work|breathwork|pranayama|kirtan|mantra|'
    r'singing\s*bowl|tibetan|holotropic|cacao|kundalini|ecstatic\s*dance|tantra|ceremony|temazcal|shaman|sacred|'
    r'akashic|astro|birth\s*chart|melukat|reiki|massage|ayurved|somatic|bodywork|lymphatic|spa|sauna|ice\s*bath|'
    r'crystal|incense\s*course|smoke\s*incense|healing|sacred\s*smoke|essence\s*alchemy|tea\s*ceremony|womens?\s*circle|mens?\s*circle|melukat)\b',
    re.IGNORECASE
)

MENTAL_PAT = re.compile(
    r'\b(workshop|circle|talks?|coaching|retreat|immersion|day\s*pass|teacher\s*training|training|'
    r'consultation|cycle\s*wisdom|cycle\s*health|holistic|consent|boundaries|intimacy|shadow|addiction|'
    r'study\s*circle|networking|archetypes|future\s*talks|gastronomy|leaders|teaching|method|self\s*love|'
    r'connect|relearn|going\s*beyond|art\s*of\s*softening|softening|feminine|masculine|manhood|womanhood|'
    r'awaken|alchemy|wisdom|growth)\b',
    re.IGNORECASE
)

# Outdoor sports
OUTDOOR_PAT = re.compile(
    r'\b(surf|surfing|kitesurf|kite\s*surf|wing\s*foil|foiling|dive|diving|scuba|snorkel|watersport|water\s*sport|'
    r'rafting|kayak|paddle|sup|trek|hike|hiking|bike|cycling|dirt|moto|motor|swim|jungle\s*club|bird\s*park|'
    r'turtle|boat|yacht|sail|sailing|fishing|spearfish|atv|run\s*club|climb|climbing|lembongan|nusa\s*penida|'
    r'longboard|jungle\s*pool)\b',
    re.IGNORECASE
)

# Food experiences (high-end / curated)
FOOD_PAT = re.compile(
    r'\b(winery|vineyard|sababay|wine\s*tour|wine\s*tasting|brunch|degustation|tasting\s*menu|'
    r'michelin|private\s*dinner|private\s*chef|chef[s\']*\s*table|sommelier|pairing|gala\s*dinner|'
    r'gastronomy|culinary|food\s*tour|coffee\s*cupping|sake|whisky|mixology|cocktail\s*class)\b',
    re.IGNORECASE
)

# Nightlife
NIGHTLIFE_PAT = re.compile(
    r'\b(rave|club|nightclub|dj\b|edm|techno|house\s*music|nightlife|party|pub\s*crawl|bar\s*crawl|'
    r'all\s*white|11pm|midnight|after.?party|savaya|red\s*ruby|paradiso|finns|omnia|midaz|atlas|'
    r'cocorico|wahala|mesa\b|hatch|utopia|cave\s*club|terminus|perro\s*loco|eric\s*prydz|artbat|'
    r'beach\s*club|pool\s*party|sunset\s*session|fight\s*night|live\s*music\b|live\s*dj|firebeatz|joezi|'
    r'amaphoria|baobab|disko|orange\s*brain|will\s*sparks|tom\s*baker|floyd\s*lavine|flight\s*facilities|'
    r'full\s*moon|table\s*booking|gl\s*&\s*ga|free\s*entry|deposit\s*pass|nuanu\s*entrance|cretya|'
    r'duro|casa\b|lumen|side\s*2\s*side|dance\s*temple|backyard\s*vol|muin|to\s*fora|luna\s*summer|'
    r'siki|annual\s*marriott|charity\s*golf|ku\s*de\s*ta|hikaria|night\s*walk|mamaka\s*run)\b',
    re.IGNORECASE
)

# Entertainment / workshops (catch-all for play)
ENTERTAINMENT_HINT = re.compile(
    r'\b(workshop|paint|painting|art|gift\s*voucher|alpaca|wolf\s*lodge|moto\s*park|coaching|'
    r'soap\s*making|tufting|tuftie|skincare|sharing\s*trip|nature|productivity|'
    r'cinema|movie|theater|theatre|exhibition|gallery|fashion|wrestling|battlegrounds|dance\s*camp|'
    r'lindy|salsa|festival|immersive|experience|jewelry|photographic|memories|coronation|'
    r'show|tour|class\b|lesson|inversion(s)?|treasure|archipelago|splash|cretya|first\s*drink|'
    r'cook\s*for\s*people|community\s*kitchen|nuanu\b|alpha\s*wolf|ride\s*and\s*rental|introduction|'
    r'bar\s*soap|everytuft|tuftie|gift|voucher|deposit|sip|blacklight|glow|tuftie)\b',
    re.IGNORECASE
)


def classify(title, current_cat, current_sub):
    """Return (new_top_category, wellness_sub_or_None)."""
    t = title or ''

    # ---- Wellness stays wellness, but recompute sub ----
    if current_cat == 'wellness':
        # check for misclassifications first (was put in wellness but isn't)
        # if it's live music / DJ / nightclub → move to nightlife
        if NIGHTLIFE_PAT.search(t) and not YOGA_STRICT.search(t):
            return ('nightlife', None)
        # if it's puppy painting / paint and sip / art class → entertainment
        if re.search(r'\b(paint|painting|tufting|art\s*workshop|jewelry|comedy|improv)\b', t, re.IGNORECASE) \
           and not YOGA_STRICT.search(t):
            return ('entertainment', None)

        # decide wellness sub
        # 1. Strict yoga check (must match yoga AND not be overridden)
        if YOGA_STRICT.search(t) and not NOT_YOGA_OVERRIDE.search(t):
            return ('wellness', 'yoga')
        # 2. Healing/energy
        if HEALING_PAT.search(t):
            return ('wellness', 'healing')
        # 3. Mental/growth
        if MENTAL_PAT.search(t):
            return ('wellness', 'mental')
        # 4. fallback → mental (workshops/talks)
        return ('wellness', 'mental')

    # ---- Play gets split into 4 top-level categories ----
    if current_cat == 'play':
        # 1. outdoor sports
        if OUTDOOR_PAT.search(t):
            return ('outdoor', None)
        # 2. food experience
        if FOOD_PAT.search(t):
            return ('food', None)
        # 3. nightlife
        if NIGHTLIFE_PAT.search(t):
            return ('nightlife', None)
        # 4. fallback → entertainment
        return ('entertainment', None)

    # ---- everything else (stay/work/community/food) keeps its category ----
    return (current_cat, current_sub)


# ---------- 4. Apply classification ----------
all_places_by_file = {}
for fname, payload in data.items():
    new_places = []
    for p in payload.get('places', []):
        n = p.get('name')
        if isinstance(n, dict):
            title = n.get('en') or n.get('zh') or ''
        elif isinstance(n, str):
            title = n
        else:
            title = ''
        new_cat, new_sub = classify(title, p.get('category'), p.get('subcategory'))
        p['category'] = new_cat
        if new_cat == 'wellness':
            p['subcategory'] = new_sub
        else:
            # non-wellness no longer needs subcategory
            p.pop('subcategory', None)
        new_places.append(p)
    all_places_by_file[fname] = new_places

# ---------- 5. Yoga cap to ~35 (venue dedup → quality fallback) ----------
flat = []
for fname, places in all_places_by_file.items():
    for p in places:
        flat.append((fname, p))

yoga_items = [(i, fp) for i, fp in enumerate(flat) if fp[1].get('category')=='wellness' and fp[1].get('subcategory')=='yoga']
print(f"\n[yoga cap] before: {len(yoga_items)} yoga events")

def _title_of(p):
    n = p.get('name')
    if isinstance(n, dict):
        return n.get('en') or n.get('zh') or ''
    return n if isinstance(n, str) else ''

def venue_key(title):
    """Extract venue: stuff before '|', '-', '@', 'by', 'at' """
    t = title or ''
    # try common separators
    for sep in ['|', ' - ', ' @ ', ' by ', ' at ', ' BY ', ' AT ']:
        if sep in t:
            return t.split(sep)[0].strip().lower()[:40]
    return t.strip().lower()[:40]

# group yoga by venue
yoga_by_venue = collections.defaultdict(list)
for orig_i, (fname, p) in yoga_items:
    yoga_by_venue[venue_key(_title_of(p))].append((orig_i, fname, p))

# keep 1 per venue (the one with image/desc/url first)
def quality(p):
    score = 0
    if p.get('image'): score += 3
    desc = (p.get('desc') or {}).get('en') or ''
    if desc and len(desc) > 20: score += 2
    if p.get('url'): score += 1
    return score

KEEP_YOGA_TARGET = 35
keep_set = set()
# Phase 1: 1 per venue
for venue, items in yoga_by_venue.items():
    items_sorted = sorted(items, key=lambda x: -quality(x[2]))
    keep_set.add(items_sorted[0][0])

print(f"[yoga cap] after 1-per-venue: {len(keep_set)}")

# Phase 2: if still need more, add 2nd-best from venues that have multiple
if len(keep_set) < KEEP_YOGA_TARGET:
    candidates = []
    for venue, items in yoga_by_venue.items():
        if len(items) > 1:
            items_sorted = sorted(items, key=lambda x: -quality(x[2]))
            for x in items_sorted[1:]:
                candidates.append(x)
    candidates.sort(key=lambda x: -quality(x[2]))
    for x in candidates:
        if len(keep_set) >= KEEP_YOGA_TARGET: break
        keep_set.add(x[0])

# Phase 3: if too many, sort all kept by quality and trim
if len(keep_set) > KEEP_YOGA_TARGET:
    kept_with_q = sorted(
        [(idx, quality(flat[idx][1])) for idx in keep_set],
        key=lambda x: -x[1]
    )
    keep_set = set(idx for idx, _ in kept_with_q[:KEEP_YOGA_TARGET])

print(f"[yoga cap] final keep: {len(keep_set)}")

# Mark dropped yoga events for removal
dropped_yoga_indices = set(orig_i for orig_i, _ in yoga_items) - keep_set
print(f"[yoga cap] dropping {len(dropped_yoga_indices)} yoga events")

# ---------- 5b. Nightlife & entertainment venue dedup (1 per venue) ----------
def venue_key_dedup(t):
    for sep in ['|', ' - ', ' @ ', ' BY ', ' AT ']:
        if sep in t:
            return t.split(sep)[0].strip().upper()[:30]
    return t.strip().upper()[:30]

DEDUP_CATS = ('nightlife', 'entertainment')
dedup_drop = set()
for target_cat in DEDUP_CATS:
    by_venue = collections.defaultdict(list)
    for i, (fname, p) in enumerate(flat):
        if i in dropped_yoga_indices: continue
        if p.get('category') != target_cat: continue
        by_venue[venue_key_dedup(_title_of(p))].append((i, p))
    for venue, items in by_venue.items():
        if len(items) <= 1: continue
        items_sorted = sorted(items, key=lambda x: -quality(x[1]))
        for idx, _ in items_sorted[1:]:
            dedup_drop.add(idx)
print(f"[venue dedup] dropping {len(dedup_drop)} duplicate venue entries")

# Rebuild per-file lists
final_by_file = collections.defaultdict(list)
for i, (fname, p) in enumerate(flat):
    if i in dropped_yoga_indices: continue
    if i in dedup_drop: continue
    final_by_file[fname].append(p)

# ---------- 6. Write back ----------
for fname, payload in data.items():
    payload['places'] = final_by_file[fname]
    files[fname].write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )

# ---------- 7. Stats ----------
all_final = [p for places in final_by_file.values() for p in places]
print(f"\n========================================")
print(f"  Total places: {len(all_final)}")
print(f"========================================")

cat_count = collections.Counter(p.get('category') for p in all_final)
ORDER = ['stay', 'work', 'food', 'wellness', 'nightlife', 'outdoor', 'entertainment', 'community']
print("\n=== Top-level categories ===")
for c in ORDER:
    print(f"  {c:15s} {cat_count.get(c, 0)}")

print("\n=== Wellness sub-groups ===")
sub_count = collections.Counter(p.get('subcategory') for p in all_final if p.get('category')=='wellness')
for s in ['yoga', 'healing', 'mental']:
    print(f"  {s:15s} {sub_count.get(s, 0)}")

# Examples
print("\n=== Sample titles per category (up to 5 each) ===")
samples = collections.defaultdict(list)
for p in all_final:
    cat = p.get('category')
    title = _title_of(p)
    if len(samples[cat]) < 5 and title:
        samples[cat].append(title[:75])
for c in ORDER:
    print(f"\n  -- {c} --")
    for s in samples[c]:
        print(f"     · {s}")

# Final HTML entity sanity check
import re as _re
ent = _re.compile(r'&(amp|lt|gt|quot|apos|#\d+|nbsp);')
remaining = 0
for p in all_final:
    for f in ['name', 'desc']:
        v = p.get(f) or {}
        if isinstance(v, dict):
            for lang, txt in v.items():
                if isinstance(txt, str) and ent.search(txt):
                    remaining += 1
print(f"\n[entity cleanup] remaining HTML entities: {remaining}")
