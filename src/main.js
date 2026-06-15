import './styles.css'
import i18next from 'i18next'

import zh from './locales/zh.json'
import en from './locales/en.json'
import id from './locales/id.json'

import baliData from './data/bali.json'

// ──────────────────────────────────────────────────────────────────────────
// 多城市資料註冊：之後加峴港 / 清邁，只要 import 新 JSON 並 push 進來即可
// ──────────────────────────────────────────────────────────────────────────
const CITIES = {
  bali: baliData,
  // danang: danangData,
  // chiangmai: chiangmaiData,
}

const SUPPORTED_LANGS = ['zh', 'en', 'id']
const DEFAULT_LANG = 'zh'

// ──────────────────────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────────────────────
const state = {
  citySlug: 'bali',
  lang: localStorage.getItem('lang') || DEFAULT_LANG,
  filter: {
    category: 'all',
    area: 'all',
    tag: 'all',
    keyword: '',
  },
}

// ──────────────────────────────────────────────────────────────────────────
// i18n init（包進 async main，避免 top-level await）
// ──────────────────────────────────────────────────────────────────────────
async function bootstrap() {
  await i18next.init({
    lng: state.lang,
    fallbackLng: 'en',
    resources: {
      zh: { translation: zh },
      en: { translation: en },
      id: { translation: id },
    },
  })
  render()
}

// 拿一個欄位的當前語言版本（資料 JSON 的 description / name 等）
function tField(obj) {
  if (obj == null) return ''
  if (typeof obj === 'string') return obj
  return obj[state.lang] || obj.en || obj.zh || Object.values(obj)[0] || ''
}

const t = (k, opts) => i18next.t(k, opts)

// ──────────────────────────────────────────────────────────────────────────
// SVG icons (inline，輕量)
// ──────────────────────────────────────────────────────────────────────────
const icons = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"/><path d="M17.657 16.657 13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  arrowDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="h-4 w-4"><path d="M12 5v14"/><path d="m5 12 7 7 7-7"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
  threads: `<svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M12.18 24h-.06C8.04 23.97 4.93 22.7 3.1 20.22 1.46 18 .62 14.9.61 11.99v-.02c.01-2.91.85-6 2.49-8.22C4.93 1.3 8.04.03 12.12 0h.07c3.04.02 5.59.74 7.58 2.14 1.86 1.31 3.18 3.19 3.91 5.57l-1.92.58c-1.23-4.05-4.09-6.18-9.58-6.22-3.62.03-6.36 1.18-8.13 3.41C2.42 7.55 1.69 10.27 1.68 12c.01 1.73.74 4.45 2.37 6.52 1.77 2.23 4.5 3.38 8.13 3.41 3.26-.02 5.42-.78 7.21-2.55 2.04-2.02 2-4.5 1.35-6.01-.39-.89-1.09-1.62-2.04-2.17-.24 1.65-.76 3-1.57 4.04-1.09 1.4-2.66 2.16-4.66 2.27-1.52.09-2.99-.27-4.13-1.01-1.35-.88-2.13-2.21-2.21-3.76-.16-3.05 2.27-5.25 6.06-5.47.67-.04 1.36-.04 2.08.01-.1-.59-.29-1.06-.59-1.41-.4-.47-1.04-.71-1.92-.72-.01 0-.04 0-.05 0-.7 0-1.65.19-2.26 1.09L9.7 5.5c.82-1.2 2.15-1.85 3.74-1.85h.06c2.66.02 4.25 1.65 4.41 4.49.09.04.18.08.27.12 1.32.62 2.29 1.57 2.79 2.74.71 1.65.77 4.34-1.32 6.65-2.31 2.55-5.61 2.94-7.14 2.94v.01zm.96-12.06c-.21 0-.43.01-.65.02-2.84.16-4.41 1.46-4.32 3.13.09 1.74 2.01 2.55 3.85 2.45 1.7-.09 3.92-.75 4.3-5.13-.42-.09-.83-.16-1.22-.21-.7-.16-1.36-.26-1.96-.26z"/></svg>`,
}

// ──────────────────────────────────────────────────────────────────────────
// Render
// ──────────────────────────────────────────────────────────────────────────
function render() {
  const city = CITIES[state.citySlug]
  const root = document.getElementById('app')
  root.innerHTML = `
    ${renderNav(city)}
    ${renderHero(city)}
    ${renderFilters(city)}
    ${renderGrid(city)}
    ${renderFooter()}
  `
  attachHandlers()
  // 設定 html lang attribute
  document.documentElement.lang = state.lang === 'zh' ? 'zh-Hant' : state.lang
}

function renderNav(city) {
  const langs = SUPPORTED_LANGS.map(
    (l) =>
      `<button data-lang="${l}" class="px-2 py-1 text-xs font-mono uppercase tracking-wider transition ${
        state.lang === l ? 'text-sand-50' : 'text-sand-300/50 hover:text-sand-200'
      }">${l}</button>`
  ).join('<span class="text-sand-300/30">/</span>')

  return `
  <header class="sticky top-0 z-40 backdrop-blur-md bg-ink-950/70 border-b border-ink-800/80">
    <div class="container-narrow flex items-center justify-between py-3">
      <a href="#" class="group flex items-center gap-2.5">
        <img src="/mars-logo.svg" alt="Mars" class="h-8 w-8 transition group-hover:rotate-12" />
        <div class="leading-tight">
          <div class="font-serif text-lg text-sand-50">${t('brand.name')}</div>
          <div class="text-[10px] uppercase tracking-[0.2em] text-sand-300/60 font-mono">${t('brand.sub')}</div>
        </div>
      </a>
      <div class="flex items-center gap-3">
        <div class="hidden sm:flex items-center gap-1.5 chip">
          <span>${city.city.flag}</span>
          <span>${tField(city.city.name)}</span>
        </div>
        <div class="flex items-center gap-1.5 border border-ink-700 rounded-full px-2 py-0.5">
          ${langs}
        </div>
      </div>
    </div>
  </header>`
}

function renderHero(city) {
  return `
  <section class="relative overflow-hidden">
    <div class="container-narrow py-16 sm:py-24 relative">
      <div class="label-overline mb-4">${t('hero.kicker')}</div>
      <h1 class="font-serif text-5xl sm:text-7xl text-sand-50 leading-[1.05] tracking-tight max-w-4xl">
        ${tField(city.city.tagline)}
      </h1>
      <p class="mt-6 max-w-2xl text-sand-200/80 text-base sm:text-lg leading-relaxed">
        ${tField(city.city.intro)}
      </p>
      <div class="mt-8 flex flex-wrap gap-2">
        ${city.city.areas
          .map(
            (a) => `
          <button data-area="${a.slug}" class="chip ${
              state.filter.area === a.slug ? 'chip-active' : ''
            }">📍 ${tField(a.name)}</button>`
          )
          .join('')}
      </div>
      <div class="mt-10 flex items-center gap-2 text-sand-300/50 text-xs font-mono uppercase tracking-widest">
        ${icons.arrowDown}<span>${t('hero.scrollHint')}</span>
      </div>
    </div>
  </section>`
}

function renderFilters(city) {
  // 收集所有用過的標籤
  const allTags = new Set()
  city.places.forEach((p) => p.tags?.forEach((t) => allTags.add(t)))
  const tagOptions = [...allTags].sort()

  const categoryOpts = [
    { value: 'all', label: t('filter.all') },
    { value: 'coworking', label: t('category.coworking') },
    { value: 'coliving', label: t('category.coliving') },
    { value: 'community', label: t('category.community') },
    { value: 'event', label: t('category.event') },
  ]
  const areaOpts = [
    { value: 'all', label: t('filter.all') },
    ...city.city.areas.map((a) => ({ value: a.slug, label: tField(a.name) })),
  ]

  const filtered = applyFilter(city.places)

  return `
  <section id="filters" class="sticky top-[57px] z-30 backdrop-blur-md bg-ink-950/85 border-b border-ink-800/80">
    <div class="container-narrow py-4 flex flex-wrap items-center gap-3">
      <label class="relative flex items-center">
        <span class="absolute left-3 text-sand-300/50">${icons.search}</span>
        <input id="searchInput" type="search" placeholder="${t('filter.search')}"
          value="${escapeAttr(state.filter.keyword)}"
          class="w-full sm:w-64 rounded-full border border-ink-600 bg-ink-800/70 pl-9 pr-3 py-2 text-sm placeholder-sand-300/40 focus:border-mars-500/60 focus:outline-none focus:ring-1 focus:ring-mars-500/40"/>
      </label>

      <select id="categorySelect" class="select-pill">
        ${categoryOpts
          .map(
            (o) =>
              `<option value="${o.value}" ${
                state.filter.category === o.value ? 'selected' : ''
              }>${t('filter.category')}: ${o.label}</option>`
          )
          .join('')}
      </select>

      <select id="areaSelect" class="select-pill">
        ${areaOpts
          .map(
            (o) =>
              `<option value="${o.value}" ${
                state.filter.area === o.value ? 'selected' : ''
              }>${t('filter.area')}: ${o.label}</option>`
          )
          .join('')}
      </select>

      <select id="tagSelect" class="select-pill">
        <option value="all" ${state.filter.tag === 'all' ? 'selected' : ''}>${t('filter.tag')}: ${t('filter.all')}</option>
        ${tagOptions
          .map(
            (tg) =>
              `<option value="${tg}" ${
                state.filter.tag === tg ? 'selected' : ''
              }>#${tg}</option>`
          )
          .join('')}
      </select>

      <button id="clearBtn" class="btn-ghost">${t('filter.clear')}</button>

      <div class="ml-auto text-xs font-mono text-sand-300/60">
        ${t('filter.resultCount', { count: filtered.length })}
      </div>
    </div>
  </section>`
}

function renderGrid(city) {
  const filtered = applyFilter(city.places)

  if (filtered.length === 0) {
    return `
      <section class="container-narrow py-24 text-center">
        <div class="font-serif text-2xl text-sand-50">${t('empty.title')}</div>
        <p class="mt-2 text-sand-300/70">${t('empty.desc')}</p>
      </section>`
  }

  // 按類別分組顯示
  const CATEGORY_ORDER = ['coworking', 'coliving', 'community', 'event']
  const grouped = {}
  CATEGORY_ORDER.forEach((c) => (grouped[c] = []))
  filtered.forEach((p) => {
    if (!grouped[p.category]) grouped[p.category] = []
    grouped[p.category].push(p)
  })

  return CATEGORY_ORDER.filter((c) => grouped[c]?.length > 0)
    .map(
      (cat) => `
    <section class="container-narrow py-12">
      <div class="flex items-end justify-between gap-4">
        <h2 class="section-title">${t('section.' + cat)}</h2>
        <span class="text-xs font-mono text-sand-300/60">${grouped[cat].length}</span>
      </div>
      <div class="section-rule"></div>
      <div class="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        ${grouped[cat].map(renderCard).join('')}
      </div>
    </section>`
    )
    .join('')
}

function renderCard(p) {
  const city = CITIES[state.citySlug]
  const areaObj = city.city.areas.find((a) => a.slug === p.area)
  const areaLabel = areaObj ? tField(areaObj.name) : p.area === 'all' ? '' : p.area

  const tagsHtml = (p.tags || [])
    .slice(0, 4)
    .map((tg) => `<span class="chip text-[10px] py-0.5">#${tg}</span>`)
    .join('')

  const fallback =
    'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=70'

  const hostHtml = p.host
    ? `<div class="mt-2 text-xs text-sand-300/70"><span class="font-mono uppercase tracking-wider text-sand-300/50">${t(
        'card.host'
      )}:</span> ${escapeHtml(p.host)}</div>`
    : ''

  const buttons = []
  if (p.gmaps) {
    buttons.push(
      `<a href="${p.gmaps}" target="_blank" rel="noopener" class="btn-ghost">${icons.map}${t('card.openMap')}</a>`
    )
  }
  if (p.link) {
    buttons.push(
      `<a href="${p.link}" target="_blank" rel="noopener" class="btn-primary">${icons.external}${t('card.openLink')}</a>`
    )
  }

  return `
    <article class="card group fade-up">
      <div class="overflow-hidden">
        <img src="${p.image || fallback}" alt="${escapeAttr(p.name)}" loading="lazy"
          onerror="this.src='${fallback}'"
          class="card-img"/>
      </div>
      <div class="flex flex-1 flex-col p-5">
        <div class="flex items-start justify-between gap-3">
          <h3 class="font-serif text-xl text-sand-50 leading-tight">${escapeHtml(p.name)}</h3>
          ${areaLabel ? `<span class="chip text-[10px] py-0.5 shrink-0">📍 ${areaLabel}</span>` : ''}
        </div>
        <p class="mt-2 text-sm text-sand-200/75 leading-relaxed line-clamp-3">${escapeHtml(tField(p.description))}</p>
        ${hostHtml}
        <div class="mt-3 flex flex-wrap gap-1.5">${tagsHtml}</div>
        ${
          buttons.length
            ? `<div class="mt-4 flex flex-wrap gap-2">${buttons.join('')}</div>`
            : ''
        }
      </div>
    </article>`
}

function renderFooter() {
  const year = new Date().getFullYear()
  return `
  <footer class="mt-20 border-t border-ink-800/80 bg-ink-900/50">
    <div class="container-narrow py-12">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 items-start">
        <div>
          <div class="flex items-center gap-2.5">
            <img src="/mars-logo.svg" alt="Mars" class="h-7 w-7" />
            <div>
              <div class="font-serif text-lg text-sand-50">${t('brand.name')}</div>
              <div class="text-[10px] uppercase tracking-[0.2em] text-sand-300/60 font-mono">${t('footer.tagline')}</div>
            </div>
          </div>
          <p class="mt-4 text-sm text-sand-200/70 leading-relaxed">${t('footer.by')}</p>
        </div>

        <div>
          <div class="label-overline">${t('footer.follow')}</div>
          <div class="mt-3 flex flex-col gap-2">
            <a id="igLink" href="https://instagram.com/" target="_blank" rel="noopener"
               class="inline-flex items-center gap-2 text-sm text-sand-200 hover:text-mars-400 transition w-fit">
              ${icons.instagram}<span>Instagram</span>
            </a>
            <a id="threadsLink" href="https://www.threads.net/" target="_blank" rel="noopener"
               class="inline-flex items-center gap-2 text-sm text-sand-200 hover:text-mars-400 transition w-fit">
              ${icons.threads}<span>Threads</span>
            </a>
          </div>
        </div>

        <div>
          <div class="label-overline">Support</div>
          <a href="#" class="mt-3 inline-flex items-center gap-2 text-sm text-mars-400 hover:text-mars-300 transition">
            ${t('footer.coffee')}
          </a>
        </div>
      </div>

      <div class="mt-10 pt-6 border-t border-ink-800/80 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-xs text-sand-300/50 font-mono">
        <span>${t('footer.rights', { year })}</span>
        <span>Built with ❤️ from somewhere on Earth.</span>
      </div>
    </div>
  </footer>`
}

// ──────────────────────────────────────────────────────────────────────────
// Filter logic
// ──────────────────────────────────────────────────────────────────────────
function applyFilter(places) {
  const { category, area, tag, keyword } = state.filter
  const kw = keyword.trim().toLowerCase()
  return places.filter((p) => {
    if (category !== 'all' && p.category !== category) return false
    if (area !== 'all' && p.area !== area && p.area !== 'all') return false
    if (tag !== 'all' && !(p.tags || []).includes(tag)) return false
    if (kw) {
      const haystack = [
        p.name,
        ...(p.tags || []),
        tField(p.description),
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    return true
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Event handlers
// ──────────────────────────────────────────────────────────────────────────
function attachHandlers() {
  // 語言切換
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lng = btn.dataset.lang
      state.lang = lng
      localStorage.setItem('lang', lng)
      i18next.changeLanguage(lng).then(render)
    })
  })

  // 地區 chip
  document.querySelectorAll('[data-area]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.area
      state.filter.area = state.filter.area === a ? 'all' : a
      render()
      // 平滑捲到篩選列
      document.getElementById('filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })

  // Search
  const searchInput = document.getElementById('searchInput')
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      state.filter.keyword = e.target.value
      // 為了不打斷打字，只重繪結果區即可，但簡化起見整頁重繪
      const start = searchInput.selectionStart
      render()
      const newInput = document.getElementById('searchInput')
      if (newInput) {
        newInput.focus()
        newInput.setSelectionRange(start, start)
      }
    }, 180))
  }

  // 下拉
  const catSel = document.getElementById('categorySelect')
  if (catSel) catSel.addEventListener('change', (e) => { state.filter.category = e.target.value; render() })
  const areaSel = document.getElementById('areaSelect')
  if (areaSel) areaSel.addEventListener('change', (e) => { state.filter.area = e.target.value; render() })
  const tagSel = document.getElementById('tagSelect')
  if (tagSel) tagSel.addEventListener('change', (e) => { state.filter.tag = e.target.value; render() })

  // 清除
  const clearBtn = document.getElementById('clearBtn')
  if (clearBtn) clearBtn.addEventListener('click', () => {
    state.filter = { category: 'all', area: 'all', tag: 'all', keyword: '' }
    render()
  })

  // Mars 的社群連結
  const ig = document.getElementById('igLink')
  const th = document.getElementById('threadsLink')
  const SOCIAL = {
    instagram: 'https://www.instagram.com/mars.93.tw',
    threads:   'https://www.threads.com/@mars.93.tw',
  }
  if (ig) ig.href = SOCIAL.instagram
  if (th) th.href = SOCIAL.threads
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
function debounce(fn, wait) {
  let tid
  return (...args) => {
    clearTimeout(tid)
    tid = setTimeout(() => fn(...args), wait)
  }
}
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function escapeAttr(s = '') { return escapeHtml(s) }

// ──────────────────────────────────────────────────────────────────────────
// Go
// ──────────────────────────────────────────────────────────────────────────
bootstrap()
