# Mars's Field Guide 🪐

> A digital nomad's living guide — 數位遊牧旅居指南
> Edition 01 · **Bali** （未來陸續加入 峴港 Da Nang、清邁 Chiang Mai）

純前端靜態網站，部署在 Zeabur。集結峇里島數位遊牧最常用的地點與活動，依 **6 大主題類別** + **地區 / 標籤 / 關鍵字** 篩選；介面支援 **中文 / 英文 / 印尼文**。

## 🎯 6 大類別

| Emoji | Key | 中文 | English | 來源 |
|---|---|---|---|---|
| 🍽️ | `eat` | 吃 | Eat | _v1.5_ |
| 🏨 | `stay` | 住 | Stay | 手動策展 |
| 💻 | `work` | 工作 | Work | 手動策展 |
| 🧘 | `wellness` | 身心靈 | Wellness | **Megatix 自動更新** |
| 🌊 | `play` | 玩 | Play | **Megatix 自動更新**（音樂、夜生活、衝浪、潛水） |
| 👥 | `connect` | 連結 | Connect | 手動策展 + **Nomeo 自動更新** |

## ✨ 已完成功能

- ✅ Hero 區（含 Edition 標籤、簡介、地區快選 chips）
- ✅ 黏性篩選列：搜尋框 + 類別 / 地區 / 標籤 下拉 + 清除鈕 + 結果計數
- ✅ 卡片式網格（圖片 + 名稱 + 地區徽章 + 描述 + Tags + Google Maps + 外連按鈕）
- ✅ 按 6 大類別分組顯示（🍽️ Eat → 🏨 Stay → 💻 Work → 🧘 Wellness → 🌊 Play → 👥 Connect）
- ✅ 多語系（i18next 即時切換，記住偏好）
- ✅ 多語資料欄位（description / name 等都支援 zh / en / id）
- ✅ Google Maps 連結（用 search URL，零成本、永遠有效）
- ✅ Footer：Mars 品牌資訊、Instagram / Threads 連結、贊助連結
- ✅ Mars 品牌風格（深色 + 沙色 + 火星橘 + 極簡 SVG 火星 Logo）
- ✅ RWD（手機 / 平板 / 桌面）
- ✅ **Nomeo.io 自動爬蟲**（Playwright，每週一抓 Bali 社群聚會 → `connect` 類別）
- ✅ **Megatix.co.id 自動爬蟲**（fetch + schema.org/Event 解析，每週一抓 Bali 活動 → `wellness` / `play` 類別）
- ✅ **GitHub Actions 週更**（每週一 02:00 UTC = 峇里時間 10:00 自動跑，產生 commit → Zeabur 自動重部署）
- ✅ **失敗保險**：爬蟲結果 < 上週 50% 自動中止 + 開 GitHub Issue 通知

## 🔄 自動更新機制（Weekly Data Refresh）

```
週一 10:00 (Bali time, UTC+8)
  → GitHub Actions 自動觸發 .github/workflows/weekly-scrape.yml
  → 跑 npm run scrape:nomeo + npm run scrape:megatix
  → 若 JSON 有變動 → 自動 commit + push 回 main
  → Zeabur 偵測到 push → 自動 build + 重部署
  → 網站當天 = 最新資料 ✅
```

**保險機制**：
- 新資料筆數 < 舊資料 50% → **中止寫檔**（防 site 改版導致空檔覆蓋）
- 任一爬蟲失敗 → **自動開 GitHub Issue** 通知 Mars
- 可手動觸發：GitHub repo → Actions → Weekly Data Refresh → Run workflow

**爬蟲輸出**：
- `src/data/nomeo-bali-events.json` — Nomeo meetups (connect)
- `src/data/megatix-bali-events.json` — Megatix events (wellness / play)
- `src/data/snapshots/{source}-YYYY-MM-DD.json` — 每週快照（供 diff 排查）

## 🗂 功能入口

| 路徑 | 功能 |
|---|---|
| `/` | 首頁（目前唯一頁面，所有功能都在這） |
| 篩選查詢字串 | 規劃中 `?category=wellness&area=ubud` 直接帶入篩選 |

## 🚧 未實作 / 預計擴充（v1.5+）

- ⏳ **🍽️ Eat 類別資料**（v1.5 重點：餐廳、咖啡廳）
- ⏳ **Megatix LLM 翻譯**：目前 Megatix 自動抓的活動 `zh` / `id` 欄位是英文佔位（tField 會自動 fallback）。等接 OpenAI / Anthropic API 後做翻譯 pass。**⚠️ 等做這步時要提醒 Mars**
- ⏳ Google Maps 星標匯出（Mars 還在從 Takeout 匯出）→ 整合進地點資料
- ⏳ Google Places API 自動補圖（$0.007/image）取代主題圖
- ⏳ Ebook 預覽頁（`/book` 或 `/guide`，PDF 買斷商業模式 v1.5）
- ⏳ URL Query 同步篩選狀態（`?category=wellness&area=ubud`）
- ⏳ 城市切換（介面骨架已預留，等資料）
- ⏳ 收藏功能（localStorage）
- ⏳ 主題圖庫 + 漸層覆蓋（Phase 1 視覺一致性策略）

## 📁 專案結構

```
webapp/
├─ .github/workflows/
│  └─ weekly-scrape.yml         # GitHub Actions 週更
├─ scripts/
│  ├─ scrape-nomeo.mjs          # Nomeo 爬蟲（Playwright）
│  └─ scrape-megatix.mjs        # Megatix 爬蟲（fetch + ld+json）
├─ index.html                   # 入口 HTML
├─ src/
│  ├─ main.js                   # 主邏輯（render / i18n / filter）
│  ├─ styles.css                # Tailwind + 自訂樣式
│  ├─ data/
│  │  ├─ bali.json              # 峇里島手動策展資料（41 筆）
│  │  ├─ nomeo-bali-events.json # Nomeo 自動爬（每週更新）
│  │  ├─ megatix-bali-events.json # Megatix 自動爬（每週更新）
│  │  └─ snapshots/             # 歷史快照（diff 用）
│  └─ locales/
│     ├─ zh.json                # 介面翻譯：繁中
│     ├─ en.json                # 介面翻譯：英文
│     └─ id.json                # 介面翻譯：印尼文
├─ public/
│  ├─ favicon.svg               # Mars logo (favicon)
│  └─ mars-logo.svg             # Mars logo (header)
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ zeabur.json                  # Zeabur 部署設定（靜態站）
└─ ecosystem.config.cjs         # 本機 PM2 預覽（dev only）
```

## 🧩 資料 Schema

每一筆地點/活動放在對應的 JSON 檔的 `places` 陣列：

```jsonc
{
  "id": "unique-slug",          // 自動爬的會加前綴 nomeo- / megatix-
  "name": { "zh": "...", "en": "...", "id": "..." },  // 或單一字串
  "category": "eat | stay | work | wellness | play | connect",
  "area": "canggu | seminyak | ubud | pererenan | uluwatu | ...",
  "tags": ["yoga", "ubud", "weekly", "..."],
  "description": {
    "zh": "中文描述",
    "en": "English description",
    "id": "Deskripsi bahasa Indonesia"
  },
  "image": "https://...",
  "gmaps": "https://www.google.com/maps/search/?api=1&query=...",
  "link":  "https://... (官網或活動頁)",
  "host":  "主辦人或場地（可選）",
  "price": "Rp 100,000",        // Megatix 自動填
  "source": "megatix | nomeo"   // 自動爬的會標來源
}
```

**手動新增條目 = 編輯 `src/data/bali.json`，無需資料庫、無需後端。**

## 🛠 本機開發

```bash
npm install
npm run dev          # Vite dev server (port 5173)
npm run build        # 產生 dist/
npm run preview      # 本機預覽 build 結果 (port 3000)

# 爬蟲（手動觸發）
npm run scrape:nomeo
npm run scrape:megatix
npm run scrape:all   # 兩個一起跑
```

PM2 開發預覽：
```bash
pm2 start ecosystem.config.cjs
pm2 logs nomad-guide --nostream
```

## 🚀 部署到 Zeabur

### 方式 A：GitHub 連動（推薦 — 也是自動更新鏈的關鍵）
1. 把這個專案 push 到 GitHub（已完成：`MarshallNo1/Mars_Nomad_Guide`）
2. Zeabur 控制台 → Create Service → Git → 選 repo
3. Zeabur 偵測 `zeabur.json` → 自動 `npm run build` + 輸出 `dist/`
4. 每次 push（包括 GitHub Actions 的週更 commit）→ Zeabur 自動重部署

### 方式 B：CLI 部署
```bash
npm install -g zeabur
zeabur login
zeabur deploy
```

## 🎨 視覺風格

- **配色**：深墨色 `#0d0a09` + 沙色 `#cdb585` + 火星橘 `#d65a36` + 霓虹綠輔色
- **字體**：標題 Cormorant Garamond / Noto Serif TC；內文 Inter / Noto Sans TC
- **品牌**：Mars 個人風格 — 旅居 × 科技 × Wellness

## 🌏 多城市擴充

要新增「峴港版」或「清邁版」：
1. 複製 `src/data/bali.json` → `src/data/danang.json` 或 `chiangmai.json`
2. 修改 `src/main.js` 的 `CITIES` 物件加入新城市
3. UI 自動支援城市切換（介面骨架已預留）

## 📜 版權

© Mars · 一位熱愛遠端工作與旅居各地的科技人。
（致敬 [越南米其林指南](https://vn-michelin-guide.zeabur.app/) by The Viet Media）

---

**Last Updated**: 2026-06-20
**Tech Stack**: Vite + Vanilla JS + TailwindCSS + i18next + Playwright (Nomeo) + native fetch (Megatix)
**Deployment**: Zeabur (Static) · GitHub Actions (Weekly Data Refresh)
**Data Sources**: 手動策展 (41) + Nomeo.io (動態) + Megatix.co.id (動態)
