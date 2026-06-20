#!/usr/bin/env node
/**
 * Megatix.co.id Bali events scraper
 *
 * Strategy:
 *   1. Fetch homepage to enumerate all /events/{slug} links (Nuxt SSR).
 *   2. For each slug, fetch the event page and parse the embedded
 *      application/ld+json (schema.org/Event).
 *   3. Keep only Bali events (addressRegion === "Bali").
 *   4. Classify into our 6-category system using title + venue keywords.
 *   5. Filter out kids/family events.
 *   6. Emit src/data/megatix-bali-events.json with the same place schema
 *      used by bali.json / nomeo-bali-events.json.
 *
 * Output i18n strategy (v1): English original goes into all three locales
 * (zh/en/id) — the tField() helper on the frontend falls back gracefully.
 * v1.5 TODO: integrate an LLM translator pass for zh/id.
 *
 * No browser required — uses native fetch + small regex parsing.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_FILE = `${__dirname}/../src/data/megatix-bali-events.json`
const SNAPSHOT_DIR = `${__dirname}/../src/data/snapshots`

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const HOME_URL = 'https://megatix.co.id/'
const EVENTS_URL = 'https://megatix.co.id/events'
const BASE = 'https://megatix.co.id'

// ── 1. Classifiers ─────────────────────────────────────────────────────────

const WELLNESS_KEYWORDS = [
  'yoga', 'ecstatic dance', 'breath work', 'breathwork', 'sound healing',
  'sound bath', 'meditation', 'cacao', 'kundalini', 'tantra', 'reiki',
  'the yoga barn', 'radiantly alive', 'alchemy yoga', 'pyramids of chi',
  'wellness', 'healing', 'pranayama', 'qigong', 'ice bath', 'sauna',
]

const PLAY_NIGHTLIFE_KEYWORDS = [
  'festival', 'rave', 'pub crawl', 'bar crawl',
  'savaya', 'finns', 'la favela', 'ruby', 'paradiso', 'omnia',
  'dissolve', 'will sparks', 'joezi',
  'nightclub', 'club night',
]

const PLAY_WATER_KEYWORDS = [
  'surf', 'surfing', 'dive', 'diving', 'snorkel', 'watersport',
  'rafting', 'kayak', 'paddleboard', 'sup ',
]

// Exclude these — not our audience
const EXCLUDE_KEYWORDS = [
  'kids', 'children', 'daycare', 'baby', 'family workshop',
  'nanny', 'art warung', 'artsy sunday', 'creative space for kids',
]

// Bali area detection (location string match)
const BALI_AREAS = [
  'ubud', 'canggu', 'seminyak', 'pererenan', 'uluwatu', 'kuta',
  'denpasar', 'sanur', 'jimbaran', 'nusa dua', 'bingin', 'amed',
  'lovina', 'munduk', 'sidemen', 'tabanan', 'bukit', 'tanjung benoa',
  'kerobokan', 'umalas', 'gianyar', 'badung', 'klungkung',
]

// Indonesian regions that are NOT Bali (used to confidently exclude)
const NON_BALI_REGIONS = [
  'phuket', 'bangkok', 'thailand', 'singapore', 'malaysia', 'johor',
  'jakarta', 'java', 'lombok', 'surabaya', 'yogyakarta', 'bandung',
]

function lower(s) {
  return (s || '').toString().toLowerCase()
}

function classifyCategory(title, venue) {
  const hay = `${lower(title)} ${lower(venue)}`

  if (EXCLUDE_KEYWORDS.some((k) => hay.includes(k))) return null // skip

  if (WELLNESS_KEYWORDS.some((k) => hay.includes(k))) return 'wellness'
  if (PLAY_NIGHTLIFE_KEYWORDS.some((k) => hay.includes(k))) return 'play'
  if (PLAY_WATER_KEYWORDS.some((k) => hay.includes(k))) return 'play'

  // Fallback: ambiguous events (music, art shows) → play
  if (/(music|concert|dj |edm|techno|house |gig)/i.test(hay)) return 'play'

  return 'play' // default bucket for "stuff to do"
}

function detectArea(addressLocality, addressStreet, venueName) {
  const hay = lower(`${addressLocality} ${addressStreet} ${venueName}`)
  for (const a of BALI_AREAS) {
    if (hay.includes(a)) return a.replace(/\s+/g, '-')
  }
  return null
}

function makeTags(category, area, title, venue) {
  const tags = []
  if (area) tags.push(area)
  const hay = `${lower(title)} ${lower(venue)}`
  if (hay.includes('ecstatic')) tags.push('ecstatic-dance')
  if (hay.includes('yoga')) tags.push('yoga')
  if (hay.includes('breath')) tags.push('breathwork')
  if (hay.includes('sound')) tags.push('sound-healing')
  if (hay.includes('meditation')) tags.push('meditation')
  if (hay.includes('cacao')) tags.push('cacao')
  if (hay.includes('surf')) tags.push('surf')
  if (hay.includes('div')) tags.push('diving')
  if (hay.includes('festival')) tags.push('festival')
  if (hay.includes('crawl')) tags.push('pub-crawl')
  tags.push('megatix')
  return [...new Set(tags)]
}

// ── 2. HTTP fetch with retry ───────────────────────────────────────────────

async function fetchHtml(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      console.warn(`  retry ${i + 1}/${retries} for ${url}: ${e.message}`)
      if (i === retries - 1) throw e
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

// ── 3. Extract event slugs from a listing page ─────────────────────────────

function extractSlugs(html) {
  const set = new Set()
  const re = /\/events\/([a-z0-9-]+)/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const slug = m[1]
    if (slug === 'search') continue
    set.add(slug)
  }
  return [...set]
}

// ── 4. Parse a single event detail page ────────────────────────────────────

function parseEventPage(html, slug) {
  const m = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
  )
  if (!m) return null
  let data
  try {
    data = JSON.parse(m[1].trim())
  } catch {
    return null
  }
  if (data['@type'] !== 'Event') return null

  // Fallback image from og:image
  let image = Array.isArray(data.image) ? data.image[0] : data.image
  if (!image) {
    const og = html.match(/property="og:image"\s+content="([^"]+)"/)
    if (og) image = og[1]
  }

  return {
    slug,
    name: data.name,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    location: {
      name: data.location?.name || '',
      locality: data.location?.address?.addressLocality || '',
      region: data.location?.address?.addressRegion || '',
      country: data.location?.address?.addressCountry || '',
      street: data.location?.address?.streetAddress || '',
    },
    image: image || null,
    price: data.offers?.price ? Number(data.offers.price) : null,
    priceCurrency: data.offers?.priceCurrency || null,
    url: data.offers?.url || `${BASE}/events/${slug}`,
    organizer: data.organizer?.name || '',
  }
}

// ── 5. Bali filter ─────────────────────────────────────────────────────────

function isBali(ev) {
  if (!ev) return false
  const region = lower(ev.location.region)
  const country = lower(ev.location.country)
  const locality = lower(ev.location.locality)
  const venue = lower(ev.location.name)
  const street = lower(ev.location.street)
  const hay = `${region} ${locality} ${venue} ${street}`

  // Hard exclude: known non-Bali regions
  if (NON_BALI_REGIONS.some((r) => hay.includes(r))) return false

  // Region contains "bali" (covers "Bali", "Bali — Bali", etc.)
  if (region.includes('bali')) return true

  // Country is Indonesia + locality/venue mentions a Bali sub-region
  if (country.includes('indonesia')) {
    if (BALI_AREAS.some((a) => hay.includes(a))) return true
  }
  return false
}

// ── 6. Format price as IDR string ──────────────────────────────────────────

function formatPrice(price, currency) {
  if (!price) return null
  if (currency !== 'IDR') return `${currency} ${price}`
  return `Rp ${Math.round(price).toLocaleString('en-US')}`
}

// ── 7. Build a Place record from parsed event ──────────────────────────────

function toPlace(ev) {
  const category = classifyCategory(ev.name, ev.location.name)
  if (!category) return null // excluded

  const area = detectArea(
    ev.location.locality,
    ev.location.street,
    ev.location.name
  )

  const venue = ev.location.name || ev.location.locality || 'Bali'
  // v1 i18n: English original mirrored to all three locales.
  // TODO(v1.5): replace with LLM translation.
  const englishName = ev.name
  const englishDesc = [
    `📍 ${venue}`,
    ev.location.locality && ev.location.locality !== venue ? ev.location.locality : '',
    formatPrice(ev.price, ev.priceCurrency) ? `💰 ${formatPrice(ev.price, ev.priceCurrency)}` : '',
    ev.organizer ? `🎟 ${ev.organizer}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const gmapsQuery = encodeURIComponent(`${venue} Bali`)
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${gmapsQuery}`

  return {
    id: `megatix-${ev.slug}`,
    name: { zh: englishName, en: englishName, id: englishName },
    category,
    area: area || 'bali',
    tags: makeTags(category, area, ev.name, ev.location.name),
    description: { zh: englishDesc, en: englishDesc, id: englishDesc },
    image: ev.image,
    gmaps,
    link: ev.url,
    host: ev.organizer || null,
    price: formatPrice(ev.price, ev.priceCurrency),
    startDate: ev.startDate,
    endDate: ev.endDate,
    source: 'megatix',
  }
}

// ── 8. Main pipeline ───────────────────────────────────────────────────────

async function main() {
  console.log('🛰  Megatix Bali scraper starting…')

  // Step 1: enumerate slugs from BOTH / and /events (union)
  console.log('  ➜ fetching listing pages…')
  const [homeHtml, eventsHtml] = await Promise.all([
    fetchHtml(HOME_URL),
    fetchHtml(EVENTS_URL),
  ])
  const slugs = [
    ...new Set([...extractSlugs(homeHtml), ...extractSlugs(eventsHtml)]),
  ]
  console.log(`  ➜ found ${slugs.length} unique event slugs`)

  // Step 2: fetch each detail page (small concurrency to be polite)
  const events = []
  const CONCURRENCY = 4
  for (let i = 0; i < slugs.length; i += CONCURRENCY) {
    const batch = slugs.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const html = await fetchHtml(`${BASE}/events/${slug}`)
        return parseEventPage(html, slug)
      })
    )
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        events.push(r.value)
      } else if (r.status === 'rejected') {
        console.warn(`  ⚠️  failed ${batch[idx]}: ${r.reason?.message || r.reason}`)
      }
    })
  }
  console.log(`  ➜ parsed ${events.length} event records`)

  // Step 3: filter Bali
  const baliEvents = events.filter(isBali)
  const dropped = events
    .filter((e) => !isBali(e))
    .map((e) => `${e.name} (${e.location.region || e.location.country || '?'})`)
  console.log(`  ➜ kept ${baliEvents.length} Bali events; dropped ${dropped.length} non-Bali:`)
  dropped.forEach((d) => console.log(`     - ${d}`))

  // Step 4: classify & filter excludes
  const places = []
  const excluded = []
  for (const ev of baliEvents) {
    const p = toPlace(ev)
    if (p) places.push(p)
    else excluded.push(ev.name)
  }
  console.log(`  ➜ classified ${places.length}; excluded ${excluded.length} (kids/family):`)
  excluded.forEach((e) => console.log(`     - ${e}`))

  // Step 5: safety guard – do NOT overwrite existing data with near-empty result
  let previousCount = 0
  if (existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_FILE, 'utf-8'))
      previousCount = prev.places?.length || 0
    } catch {}
  }
  if (previousCount > 0 && places.length < previousCount * 0.5) {
    console.error(
      `❌ ABORT: new count ${places.length} < 50% of previous ${previousCount}. ` +
        `Refusing to overwrite. Site may have changed.`
    )
    process.exit(1)
  }

  // Step 6: write output + snapshot
  const out = {
    scrapedAt: new Date().toISOString(),
    source: 'megatix.co.id',
    count: places.length,
    places,
  }
  mkdirSync(dirname(OUT_FILE), { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n')
  console.log(`  ➜ wrote ${OUT_FILE}`)

  // snapshot (for diffing history)
  mkdirSync(SNAPSHOT_DIR, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  const snapPath = `${SNAPSHOT_DIR}/megatix-${stamp}.json`
  writeFileSync(snapPath, JSON.stringify(out, null, 2) + '\n')
  console.log(`  ➜ snapshot ${snapPath}`)

  // Distribution summary
  const byCat = places.reduce((m, p) => {
    m[p.category] = (m[p.category] || 0) + 1
    return m
  }, {})
  console.log('\n📊 Category distribution:')
  Object.entries(byCat).forEach(([k, v]) => console.log(`   ${k}: ${v}`))

  console.log('\n✅ Done.')
}

main().catch((e) => {
  console.error('❌ scrape-megatix failed:', e)
  process.exit(1)
})
