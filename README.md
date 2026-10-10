# mrpippi.github.io

皮皮的個人網站，仿 Minecraft 標題畫面，使用 [Astro](https://astro.build) 建置、部署於 GitHub Pages。

## 開發

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # 型別檢查 + 輸出到 dist/
npm run preview      # 預覽建置結果
npm test             # 單元測試（Vitest）
npm run check:links  # 檢查 dist/ 的站內連結
npm run test:e2e     # 瀏覽器測試與截圖（Playwright，先 build；本機使用已安裝的 Edge）
```

## 頁面

| 路徑 | 內容 |
|---|---|
| `/` | 標題畫面：Logo、隨機黃色標語、主選單 |
| `/about/` | 關於我、統計資料（技能） |
| `/media/` | YouTube / Twitch 頻道與最新影片 |
| `/contact/` | 社群連結，Discord 按鈕可複製使用者名稱 |
| `/blog/` | 文章（有文章後主選單按鈕才會啟用） |

## 修改內容

- 畫面上的文字：`src/i18n/zh-TW.ts`（中文）與 `src/i18n/en.ts`（英文），兩個檔案的欄位必須一致（單元測試會檢查）。
- 網址、帳號、技能清單、附魔書文字等和語言無關的資料：`src/consts.ts`。

## 中英雙語

中文在根目錄，英文在 `/en/`。標題畫面、關於我、直播 & 影片、聯絡有兩種語言；文章只有中文。
右下角地球按鈕切換語言，會跳到對方語言的同一頁（沒有就回標題畫面），換頁不重新載入，音樂不中斷。

- **最新影片**：部署時自動從 `YOUTUBE.url` 查出頻道 ID 並抓一般影片的 RSS（不含 Shorts 與直播紀錄）（也可以直接把 ID 填進 `YOUTUBE.channelId`），`deploy.yml` 也設定每天台灣時間 02:00 自動重建一次。留空或抓取失敗時只顯示「前往頻道」。
- **新增文章**：在 `src/content/blog/` 放一個 `.md` 檔，`draft: true` 的文章只會在本機開發時出現：

```md
---
title: 文章標題
description: 一句話摘要
pubDate: 2026-10-10
draft: false
tags: [Minecraft, 插件]
---

內文……
```

文章清單會顯示閱讀時間與標籤，每個標籤也有自己的頁面（`/blog/tags/<標籤>/`）。有正式文章後，主選單的「文章」按鈕才會解鎖。

## 文章留言

文章頁底部用 [giscus](https://giscus.app/zh-TW)：留言存在這個 repo 的 GitHub Discussions（Announcements 分類），訪客用 GitHub 帳號登入留言。設定在 `src/consts.ts` 的 `GISCUS`。
第一次使用要安裝 giscus App：https://github.com/apps/giscus （選擇只給這個 repo）。

## 進度與彩蛋

- **進度**：定義在 `src/lib/advancements.ts`，達成時右上角跳出「進度達成！」，關於我頁面可以看到全部進度。目前有：歡迎光臨、探險家、DJ 皮皮、夜貓子、交個朋友、附魔師、書蟲、迷路了。紀錄存在訪客自己的瀏覽器裡。
- **附魔書**：關於我頁面的文字用附魔台的銀河字母顯示，點一下會逐字解讀。
- **404 死亡畫面**：找不到的網址會顯示「你死了！」、隨機死因與「分數：404」，按鈕 1 秒後才能按（同遊戲），並解鎖「迷路了」進度。
- **原版物品提示框**：滑鼠移到統計資料、進度、附魔書與右下角按鈕上會出現深紫色的原版提示框。其他元素加上 `data-tooltip`（與 `data-tooltip-lines`）即可使用。
- **換頁讀取畫面**：換頁超過 0.15 秒時顯示「正在載入地形…」與泥土背景。

## Minecraft 素材

原版素材整包放在本機的 `minecraft-assets/`（已加入 `.gitignore`，不會公開）。網站只用到其中幾張，執行下面的指令複製到 `public/mc/`：

```sh
pip install pillow
npm run mc-assets
```

要換圖或加圖時，修改 `scripts/mc-assets.py` 開頭的清單。


## 音效與音樂

原版音檔放在本機的 `minecraft-assets/sounds/`，用下面的指令轉成較小的 Opus（WebM）放到 `public/sounds/`（音樂 40 kbps、音效 64 kbps，約 25 MB → 13 MB）：

```sh
npm run audio   # 需要 ffmpeg：放在 PATH 上，或用 FFMPEG_PATH 指定
```

- 按鈕「喀」聲：原版點擊音；瀏覽器無法解碼時退回合成音（`src/lib/sound.ts`）。
- 提示「叮」聲：Web Audio API 即時合成。
- 背景音樂：Creative 1–6 隨機輪播（不連續重複同一首），預設關閉（`src/lib/music.ts`）。只有開啟時才下載，一次只下載正在播的那首。
- 換頁使用 Astro ClientRouter，不重新載入整頁，所以音樂不會中斷。

右下角四顆按鈕（捲動時固定在畫面上）依序是：語言、音樂與音效設定、音效開關、日夜切換，設定都會記住。
音樂設定面板仿原版「音樂與音效」選項：顯示正在播放的曲名、音樂與音效音量滑桿、音樂開關與下一首；每換一首會跳出原版風格的「正在播放」通知。

## 字型

- 英數：Minecraft 原版點陣字型（`minecraft-assets/textures/font/ascii.png`），附魔文用 `ascii_sga.png`，由 `npm run mc-font` 轉成 `public/fonts/` 下的 woff2。字級用 9 的倍數（18px、27px…）最銳利。
- 中文標題與按鈕：[Chiron GoRound TC](https://github.com/google/fonts/tree/main/ofl/chirongoroundtc)（SIL OFL 1.1）粗圓體，只裁出介面用到的字（`public/fonts/chiron-goround-*.woff2`）。改了翻譯檔或文章標題後執行 `npm run ui-font -- path/to/ChironGoRoundTC[wght].ttf` 重新產生。
- 內文：裝置內建的中文字型（蘋方、微軟正黑體、思源黑體），不另外下載。

字型都由網站自己提供，不經過 Google Fonts，畫面不必等外部 CSS 下載完才繪製。

## 網站分析

在 `src/consts.ts` 的 `ANALYTICS.cloudflareToken` 填入 Cloudflare Web Analytics 的 token 就會啟用（免費、不用 cookie，支援換頁追蹤）。留空則完全不載入。

## 自動化檢查

`.github/workflows/checks.yml` 在每次推送與 PR 執行：型別檢查與建置、單元測試、站內連結、Playwright 瀏覽器測試（中英文各頁、換頁不中斷、語言切換、進度、音樂面板、日夜切換）、每頁白天／夜晚截圖（桌機與手機，上傳為 `playwright-report` artifact），以及 Lighthouse 分數（無障礙與 SEO 低於 0.9 會失敗，效能與最佳做法低於門檻只警告，設定在 `lighthouserc.json`）。

## 部署

推送到 `home` 分支後，GitHub Actions（`.github/workflows/deploy.yml`）會自動建置並部署。
首次使用需到 repo **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。

非官方 Minecraft 網站，與 Mojang Studios / Microsoft 無關。
