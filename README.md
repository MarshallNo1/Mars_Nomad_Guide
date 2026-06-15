# Mars's Field Guide 🪐

> A digital nomad's living guide — 數位遊牧旅居指南
> Edition 01 · **Bali** （未來陸續加入 峴港 Da Nang、清邁 Chiang Mai）

純前端靜態網站，部署在 Zeabur。集結峇里島數位遊牧最常用的 **辦公空間、住宿、社群、活動聚會**，可依**地區 / 類別 / 標籤 / 關鍵字**篩選；介面支援**中文 / 英文 / 印尼文**。

## ✨ 已完成功能

- ✅ Hero 區（含 Edition 標籤、簡介、地區快選 chips）
- ✅ 黏性篩選列：搜尋框 + 類別 / 地區 / 標籤 下拉 + 清除鈕 + 結果計數
- ✅ 卡片式網格（圖片 + 名稱 + 地區徽章 + 描述 + Tags + Google Maps + 外連按鈕）
- ✅ 按類別分組顯示（辦公 → 住宿 → 社群 → 活動）
- ✅ 多語系（i18next 即時切換，記住偏好）
- ✅ 多語資料欄位（description / name 等都支援 zh / en / id）
- ✅ Google Maps 連結（用 search URL，零成本、永遠有效）
- ✅ Footer：Mars 品牌資訊、Instagram / Threads 連結、贊助連結
- ✅ Mars 品牌風格（深色 + 沙色 + 火星橘 + 極簡 SVG 火星 Logo）
- ✅ RWD（手機 / 平板 / 桌面）

## 🗂 功能入口

| 路徑 | 功能 |
|---|---|
| `/` | 首頁（目前唯一頁面，所有功能都在這） |
| 篩選查詢字串 | 之後可實作 `?category=coworking&area=ubud` 直接帶入篩選狀態 |

URL Query 參數（規劃中、尚未實作）：
- `?city=bali` — 切換城市
- `?lang=en` — 切換語言
- `?category=coworking&area=ubud&tag=jungle` — 預設篩選

## 🚧 未實作 / 預計擴充

- ⏳ 城市切換（目前只有 Bali，介面骨架已為多城市預留）
- ⏳ URL Query 同步篩選狀態
- ⏳ Nomeo.io 活動自動抓取腳本（每天跑一次更新 events JSON）
- ⏳ 從每個店家的官網或活動頁自動抓 `og:image` 的腳本（取代目前 Unsplash 主題圖）
- ⏳ Google Maps 嵌入 mini map（可選，需 API key）
- ⏳ 收藏功能（純 localStorage，無後端）
- ⏳ Mars 個人 IG / Threads / 贊助連結 → 替換 `src/main.js` 中的 `SOCIAL` 物件

## 📁 專案結構

```
webapp/
├─ index.html                  # 入口 HTML
├─ src/
│  ├─ main.js                  # 主邏輯（render / i18n / filter）
│  ├─ styles.css               # Tailwind + 自訂樣式
│  ├─ data/
│  │  └─ bali.json             # 峇里島地點資料（41 筆）
│  └─ locales/
│     ├─ zh.json               # 介面翻譯：繁中
│     ├─ en.json               # 介面翻譯：英文
│     └─ id.json               # 介面翻譯：印尼文
├─ public/
│  ├─ favicon.svg              # Mars logo (favicon)
│  └─ mars-logo.svg            # Mars logo (header)
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ zeabur.json                 # Zeabur 部署設定（靜態站）
└─ ecosystem.config.cjs        # 本機 PM2 預覽（dev only）
```

## 🧩 資料 Schema（重要：未來新增條目參考）

每一筆地點放在 `src/data/bali.json` 的 `places` 陣列：

```jsonc
{
  "id": "unique-slug",
  "name": "店名（單一語言即可）",
  "category": "coworking | coliving | community | event",
  "area": "canggu | seminyak | ubud | pererenan | all",
  "tags": ["coworking", "fast-wifi", "..."],
  "description": {
    "zh": "中文描述",
    "en": "English description",
    "id": "Deskripsi bahasa Indonesia"
  },
  "image": "https://...   (店家 og:image 或 unsplash)",
  "gmaps": "https://www.google.com/maps/search/?api=1&query=店名+地區",
  "link":  "https://... (官網或活動頁)",
  "host":  "（活動專用）主辦人姓名"
}
```

**新增條目 = 編輯一個 JSON 檔，無需資料庫、無需後端。**

## 🛠 本機開發

```bash
npm install
npm run dev      # Vite dev server (port 5173)
npm run build    # 產生 dist/
npm run preview  # 本機預覽 build 結果 (port 3000)
```

PM2 開發預覽：
```bash
pm2 start ecosystem.config.cjs
pm2 logs nomad-guide --nostream
```

## 🚀 部署到 Zeabur

兩種方式擇一：

### 方式 A：GitHub 連動（推薦）
1. 把這個專案 push 到 GitHub
2. 在 Zeabur 控制台 → Create Service → Git → 選這個 repo
3. Zeabur 會自動偵測 `zeabur.json` → 用 `npm run build` 並輸出 `dist/`
4. 完成後拿到 `xxx.zeabur.app` 網址

### 方式 B：CLI 部署
```bash
npm install -g zeabur
zeabur login
zeabur deploy
```

部署成功後可在 Zeabur 控制台綁定自訂網域。

## 🎨 視覺風格

- **配色**：深墨色底 `#0d0a09` + 沙色 `#cdb585` + 火星橘 `#d65a36` + 霓虹綠輔色
- **字體**：標題 Cormorant Garamond / Noto Serif TC（致敬米其林氣質）；內文 Inter / Noto Sans TC
- **品牌**：Mars 個人風格 — 旅居 × 科技 × Wellness

## 🌏 多城市擴充

要新增「峴港版」或「清邁版」：
1. 複製 `src/data/bali.json` → `src/data/danang.json` 或 `chiangmai.json`
2. 修改 `src/main.js` 的 `CITIES` 物件，加入新城市
3. UI 自動支援城市切換（介面骨架已預留）

## 📜 版權

© Mars · 一位熱愛遠端工作與旅居各地的科技人。
（致敬 [越南米其林指南](https://vn-michelin-guide.zeabur.app/) by The Viet Media）

---

**Last Updated**: 2026-06-15
**Tech Stack**: Vite + Vanilla JS + TailwindCSS + i18next
**Deployment**: Zeabur (Static)
