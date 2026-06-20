#!/usr/bin/env node
/**
 * Megatix.co.id Bali events scraper (v2 — sitemap-based)
 *
 * Why this matters:
 *   v1 only scraped the homepage (~19 events). The site actually has
 *   ~670 events listed in sitemap.xml — we were missing sound healing,
 *   breathwork, kundalini, kitesurfing, etc.
 *
 * Strategy:
 *   1. Fetch sitemap.xml → list of all event URLs (with lastmod dates).
 *   2. Pre-filter:
 *        - lastmod within the last RECENCY_DAYS (default 365)
 *        - drop URLs whose slug obviously belongs to another city/country
 *   3. Fetch each event page in parallel batches and parse the embedded
 *      application/ld+json (schema.org/Event).
 *   4. Keep only events where addressRegion contains "Bali"
 *      (or a known Bali sub-region + country=Indonesia).
 *   5. Classify into 6-category system (wellness / play) and assign tags.
 *   6. Drop kids/family/excluded events.
 *   7. 50% safety guard against overwriting with bad data.
 *
 * Output i18n strategy (v1): English original mirrored to zh/en/id.
 * TODO(v1.5): add LLM translation pass.
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

const SITEMAP_URL = 'https://megatix.co.id/sitemap.xml'
const BASE = 'https://megatix.co.id'
const RECENCY_DAYS = 365   // only events with lastmod within this window
const CONCURRENCY  = 8
const REQUEST_DELAY_MS = 50

// ── Classifiers ────────────────────────────────────────────────────────────

const WELLNESS_KEYWORDS = [
  'yoga', 'ecstatic dance', 'breath work', 'breathwork', 'sound healing',
  'sound bath', 'sound journey', 'meditation', 'cacao', 'kirtan',
  'kundalini', 'tantra', 'reiki', 'pranayama', 'qigong', 'qi gong',
  'ice bath', 'sauna', 'wellness', 'healing', 'retreat',
  'birth chart', 'astro', 'akashic', 'breath of', 'holotropic',
  'singing bowl', 'tibetan', 'bhakti', 'satsang', 'mantra',
  'somatic', 'sacred', 'ceremony', 'temazcal', 'shamanic',
  'integrated kundalini',
  // Venues
  'the yoga barn', 'radiantly alive', 'alchemy yoga', 'pyramids of chi',
  'school of unified healing', 'revv wellness',
]

const PLAY_NIGHTLIFE_KEYWORDS = [
  'festival', 'rave', 'pub crawl', 'bar crawl',
  'nightclub', 'club night', 'dj ', 'edm', 'techno', 'house music',
  'all white party', 'yacht party', 'boat party',
  'savaya', 'finns', 'la favela', 'ruby', 'paradiso', 'omnia',
  'midaz', 'mesa bali',
  'dissolve', 'will sparks', 'joezi', 'eric prydz', 'afrosonic',
  'club corazon', 'lindy', 'salsa', 'afro fusion',
]

const PLAY_WATER_KEYWORDS = [
  'surf', 'surfing', 'dive ', 'diving', 'scuba', 'snorkel', 'watersport',
  'kitesurf', 'rafting', 'kayak', 'paddleboard', ' sup ',
  'boat vibes', 'beatboat',
]

const PLAY_ADVENTURE_KEYWORDS = [
  'dirt bike', 'motor park', 'wrestling', 'fight night', 'battlegrounds',
  'turtle', 'bird park', 'jungle',
]

// Slug pre-filter: drop these slugs without fetching detail
const SLUG_EXCLUDE_PATTERNS = [
  /-yogyakarta/, /-jakarta/, /-bandung/, /-surabaya/, /-medan/,
  /thailand/, /-phuket/, /-bangkok/, /-johor/, /-singapore/, /-malaysia/,
  /-lombok/,
]

// Title/venue based exclude (kids etc.)
const EXCLUDE_KEYWORDS = [
  'kids', 'children', 'daycare', 'baby', 'family workshop',
  'nanny', 'art warung', 'artsy sunday', 'creative space for kids',
]

// Bali area detection
const BALI_AREAS = [
  'ubud', 'canggu', 'seminyak', 'pererenan', 'uluwatu', 'kuta',
  'denpasar', 'sanur', 'jimbaran', 'nusa dua', 'bingin', 'amed',
  'lovina', 'munduk', 'sidemen', 'tabanan', 'bukit', 'tanjung benoa',
  'kerobokan', 'umalas', 'gianyar', 'badung', 'klungkung',
]

const NON_BALI_REGIONS = [
  'phuket', 'bangkok', 'thailand', 'singapore', 'malaysia', 'johor',
  'jakarta', 'lombok', 'surabaya', 'yogyakarta', 'bandung', 'medan',
  'kuala lumpur',
]
// note: removed 'java' — Bali is sometimes mis-tagged as in Java region

function lower(s) {
  return (s || '').toString().toLowerCase()
}

function classifyCategory(title, venue) {
  const hay = `${lower(title)} ${lower(venue)}`
  if (EXCLUDE_KEYWORDS.some((k) => hay.includes(k))) return null

  if (WELLNESS_KEYWORDS.some((k) => hay.includes(k))) return 'wellness'
  if (PLAY_NIGHTLIFE_KEYWORDS.some((k) => hay.includes(k))) return 'play'
  if (PLAY_WATER_KEYWORDS.some((k) => hay.includes(k))) return 'play'
  if (PLAY_ADVENTURE_KEYWORDS.some((k) => hay.includes(k))) return 'play'
  if (/(music|concert|gig|live |dance )/i.test(hay)) return 'play'
  return 'play'
}

function detectArea(addressLocality, addressStreet, venueName) {
  const hay = lower(`${addressLocality} ${addressStreet} ${venueName}`)
  for (const a of BALI_AREAS) {
    if (hay.includes(a)) return a.replace(/\s+/g, '-')
  }
  return null
}

function makeTags(title, venue, area) {
  const hay = `${lower(title)} ${lower(venue)}`
  const tags = new Set()
  if (area) tags.add(area)
  if (hay.includes('ecstatic')) tags.add('ecstatic-dance')
  if (hay.includes('yoga')) tags.add('yoga')
  if (hay.includes('breath')) tags.add('breathwork')
  if (hay.includes('sound')) tags.add('sound-healing')
  if (hay.includes('meditation')) tags.add('meditation')
  if (hay.includes('cacao')) tags.add('cacao')
  if (hay.includes('kundalini')) tags.add('kundalini')
  if (hay.includes('reiki')) tags.add('reiki')
  if (hay.includes('full moon')) tags.add('full-moon')
  if (hay.includes('surf')) tags.add('surf')
  if (hay.includes('kitesurf')) tags.add('kitesurf')
  if (hay.includes('div') && !hay.includes('divine')) tags.add('diving')
  if (hay.includes('snorkel')) tags.add('snorkel')
  if (hay.includes('festival')) tags.add('festival')
  if (hay.includes('crawl')) tags.add('pub-crawl')
  if (hay.includes('boat') || hay.includes('yacht')) tags.add('boat')
  if (hay.includes('retreat')) tags.add('retreat')
  tags.add('megatix')
  return [...tags]
}

// ── HTTP ───────────────────────────────────────────────────────────────────

async function fetchHtml(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
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
      if (i === retries) throw e
      await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
}

// ── Sitemap parsing ────────────────────────────────────────────────────────

function parseSitemap(xml) {
  const out = []
  const re = /<loc>(https:\/\/megatix\.co\.id\/events\/[a-z0-9-]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    out.push({ url: m[1], lastmod: m[2], slug: m[1].split('/').pop() })
  }
  return out
}

function preFilterByDateAndSlug(entries) {
  const cutoff = new Date(Date.now() - RECENCY_DAYS * 86400 * 1000)
  const kept = []
  let droppedOld = 0, droppedSlug = 0
  for (const e of entries) {
    if (new Date(e.lastmod) < cutoff) {
      droppedOld++
      continue
    }
    if (SLUG_EXCLUDE_PATTERNS.some((re) => re.test(e.slug))) {
      droppedSlug++
      continue
    }
    kept.push(e)
  }
  console.log(`  pre-filter: kept ${kept.length} (dropped ${droppedOld} too old, ${droppedSlug} non-Bali slug)`)
  return kept
}

// ── Event page parsing ────────────────────────────────────────────────────

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

function isBali(ev) {
  if (!ev) return false
  const region = lower(ev.location.region)
  const country = lower(ev.location.country)
  const locality = lower(ev.location.locality)
  const venue = lower(ev.location.name)
  const street = lower(ev.location.street)
  const hay = `${region} ${locality} ${venue} ${street}`

  if (NON_BALI_REGIONS.some((r) => hay.includes(r))) return false
  if (region.includes('bali')) return true
  if (country.includes('indonesia')) {
    if (BALI_AREAS.some((a) => hay.includes(a))) return true
  }
  return false
}

// Event is "current" → not too long expired
function isCurrent(ev) {
  if (!ev.endDate) return true // unknown → keep
  const end = new Date(ev.endDate)
  return end >= new Date(Date.now() - 7 * 86400 * 1000) // ended within last 7 days OK
}

function formatPrice(price, currency) {
  if (!price) return null
  if (currency !== 'IDR') return `${currency} ${price}`
  return `Rp ${Math.round(price).toLocaleString('en-US')}`
}

function toPlace(ev) {
  const category = classifyCategory(ev.name, ev.location.name)
  if (!category) return null

  const area = detectArea(ev.location.locality, ev.location.street, ev.location.name)

  const venue = ev.location.name || ev.location.locality || 'Bali'
  const englishName = ev.name
  const englishDesc = [
    `📍 ${venue}`,
    ev.location.locality && ev.location.locality !== venue ? ev.location.locality : '',
    formatPrice(ev.price, ev.priceCurrency) ? `💰 ${formatPrice(ev.price, ev.priceCurrency)}` : '',
    ev.organizer ? `🎟 ${ev.organizer}` : '',
  ].filter(Boolean).join(' · ')

  const gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue} Bali`)}`

  return {
    id: `megatix-${ev.slug}`,
    name: { zh: englishName, en: englishName, id: englishName },
    category,
    area: area || 'bali',
    tags: makeTags(ev.name, ev.location.name, area),
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

// ── Parallel fetch with limited concurrency ────────────────────────────────

async function fetchAll(entries, concurrency) {
  const out = []
  let cursor = 0
  let done = 0
  const total = entries.length

  async function worker() {
    while (true) {
      const idx = cursor++
      if (idx >= entries.length) return
      const e = entries[idx]
      try {
        const html = await fetchHtml(e.url)
        const ev = parseEventPage(html, e.slug)
        if (ev) out.push(ev)
        await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS))
      } catch (err) {
        // swallow individual failures
      }
      done++
      if (done % 25 === 0 || done === total) {
        process.stdout.write(`\r  fetched ${done}/${total}…`)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  process.stdout.write('\n')
  return out
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🛰  Megatix Bali scraper (sitemap edition) starting…')

  console.log('  ➜ fetching sitemap.xml…')
  const sitemap = await fetchHtml(SITEMAP_URL)
  const entries = parseSitemap(sitemap)
  console.log(`  ➜ ${entries.length} event URLs in sitemap`)

  const candidates = preFilterByDateAndSlug(entries)
  console.log(`  ➜ fetching ${candidates.length} event pages (concurrency ${CONCURRENCY})…`)

  const events = await fetchAll(candidates, CONCURRENCY)
  console.log(`  ➜ parsed ${events.length} event records`)

  const baliEvents = events.filter(isBali).filter(isCurrent)
  console.log(`  ➜ kept ${baliEvents.length} current Bali events`)

  const places = []
  let excluded = 0
  for (const ev of baliEvents) {
    const p = toPlace(ev)
    if (p) places.push(p)
    else excluded++
  }
  console.log(`  ➜ classified ${places.length}; excluded ${excluded} (kids/family)`)

  // Safety guard
  let previousCount = 0
  if (existsSync(OUT_FILE)) {
    try { previousCount = JSON.parse(readFileSync(OUT_FILE, 'utf-8')).places?.length || 0 } catch {}
  }
  if (previousCount > 0 && places.length < previousCount * 0.5) {
    console.error(
      `❌ ABORT: new count ${places.length} < 50% of previous ${previousCount}.`
    )
    process.exit(1)
  }

  const out = {
    scrapedAt: new Date().toISOString(),
    source: 'megatix.co.id',
    count: places.length,
    places,
  }
  mkdirSync(dirname(OUT_FILE), { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n')
  console.log(`  ➜ wrote ${OUT_FILE}`)

  mkdirSync(SNAPSHOT_DIR, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  writeFileSync(`${SNAPSHOT_DIR}/megatix-${stamp}.json`, JSON.stringify(out, null, 2) + '\n')

  const byCat = places.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {})
  console.log('\n📊 Category distribution:')
  Object.entries(byCat).forEach(([k, v]) => console.log(`   ${k}: ${v}`))

  // Tag highlights
  const tagCount = {}
  places.forEach((p) => p.tags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)))
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 15)
  console.log('\n🏷  Top tags:')
  topTags.forEach(([t, c]) => console.log(`   ${t}: ${c}`))

  console.log('\n✅ Done.')
}

main().catch((e) => {
  console.error('❌ scrape-megatix failed:', e)
  process.exit(1)
})
