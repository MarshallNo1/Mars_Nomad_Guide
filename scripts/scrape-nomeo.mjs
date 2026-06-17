// 抓 Nomeo.io 最近活動，僅篩選 Bali 區域
// Usage: node scripts/scrape-nomeo.mjs
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '../src/data/nomeo-bali-events.json')

// Bali 地名清單（用來判斷活動是否在 Bali）
const BALI_AREAS = [
  'canggu', 'seminyak', 'ubud', 'pererenan', 'uluwatu', 'kuta',
  'denpasar', 'sanur', 'jimbaran', 'nusa dua', 'bingin', 'bali',
  'amed', 'lovina', 'munduk', 'sidemen', 'tabanan', 'bukit',
]

function classifyArea(locationStr = '') {
  const s = locationStr.toLowerCase()
  // 優先精確匹配
  for (const area of ['canggu', 'seminyak', 'ubud', 'pererenan', 'uluwatu', 'kuta', 'denpasar', 'sanur']) {
    if (s.includes(area)) return area
  }
  if (BALI_AREAS.some((a) => s.includes(a))) return 'canggu' // 其他 Bali 地名先歸 canggu
  return null // 非 Bali
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 2200 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  })
  const page = await ctx.newPage()
  console.log('→ Loading nomeo.io ...')
  await page.goto('https://nomeo.io/', { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(2500)

  // 多次往下捲讓更多卡片載入
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500))
    await page.waitForTimeout(800)
  }

  // 取得所有 meetup 卡片
  // Nomeo 把每張卡片包成 <a href="/m/XXXX">...</a>
  const events = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('a[href^="/m/"]'))
    return cards.map((a) => {
      const href = a.getAttribute('href')
      const text = a.innerText || ''
      const img = a.querySelector('img')
      const imgSrc = img ? img.getAttribute('src') : null
      return {
        href: 'https://nomeo.io' + href,
        text: text.trim(),
        image: imgSrc,
      }
    })
  })

  console.log(`→ Found ${events.length} cards`)

  // Parse 每張卡片的 text
  // 範例 text:
  //   "HAPPENING
  //    Let's Be Co-Working: A Chill Space to Work & Meet ...
  //    ByLet's Be Real Community & Little Brew Bali
  //    Little Brew Bali
  //    🇮🇩Pererenan
  //    Le𝓜RySaTo
  //    23 Spots"
  const parsed = events
    .map((e) => {
      const lines = e.text.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length < 2) return null

      // 第一行通常是時間或 HAPPENING / TOMORROW 等狀態
      const when = lines[0]
      const title = lines[1]
      // 找 location: 通常是包含 🇮🇩 的那行或 "Location visible..."
      const locLine = lines.find((l) => /🇮🇩|🇹🇭|🇻🇳|🇲🇽|🇮🇳|🇪🇸/.test(l)) || ''
      const hostLine = lines.find((l) => l.startsWith('By'))
      const venueLine = locLine ? lines[lines.indexOf(locLine) - 1] : null

      const area = classifyArea(locLine + ' ' + (venueLine || ''))
      return {
        href: e.href,
        when,
        title,
        host: hostLine ? hostLine.replace(/^By/, '').trim() : '',
        venue: venueLine && !venueLine.startsWith('By') ? venueLine : '',
        location: locLine,
        area,
        image: e.image,
      }
    })
    .filter(Boolean)
    .filter((e) => e.area) // 只留 Bali 的

  console.log(`→ ${parsed.length} Bali events`)

  // 轉成本站 schema
  const places = parsed.map((e, i) => {
    const id = e.href.split('/').pop()
    return {
      id: `nomeo-${id}`,
      name: e.title.replace(/\.\.\.$/, ''),
      category: 'event',
      area: e.area,
      tags: ['nomeo', 'meetup', e.when.toLowerCase().includes('happening') ? 'happening' : 'upcoming'].filter(Boolean),
      description: {
        zh: `Nomeo 平台活動：${e.when}${e.venue ? ` @ ${e.venue}` : ''}`,
        en: `Nomeo meetup: ${e.when}${e.venue ? ` @ ${e.venue}` : ''}`,
        id: `Meetup Nomeo: ${e.when}${e.venue ? ` @ ${e.venue}` : ''}`,
      },
      image: e.image || '',
      gmaps: e.venue
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue + ' Bali')}`
        : '',
      link: e.href,
      host: e.host,
      source: 'nomeo',
      scrapedAt: new Date().toISOString(),
    }
  })

  // 輸出
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ scrapedAt: new Date().toISOString(), count: places.length, places }, null, 2),
    'utf8'
  )
  console.log(`✓ Wrote ${places.length} events to ${OUT_PATH}`)

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
