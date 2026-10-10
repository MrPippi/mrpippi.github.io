# mrpippi.github.io

皮皮的個人網站，仿 Minecraft 標題畫面，使用 [Astro](https://astro.build) 建置、部署於 GitHub Pages。

## 開發

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # 型別檢查 + 輸出到 dist/ + 建立站內搜尋索引（Pagefind）
npm run preview      # 預覽建置結果
npm test             # 單元測試（Vitest）
npm run check:links  # 檢查 dist/ 的站內連結
npm run test:e2e     # 瀏覽器測試與截圖（Playwright，先 build；本機使用已安裝的 Edge；Twitch／天氣 API 會被攔截成固定回應）
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

- **最新影片**：建置時抓 YouTube 頻道的一般影片（不含 Shorts 與直播）。YouTube 常擋掉建置主機，所以依序嘗試：一般影片 RSS → 頻道 RSS（過濾 Shorts／直播）→ 頻道「影片」分頁；全部失敗時改用上次的建置快取，或 repo 裡的快照 `src/data/youtube-videos.json`。快照在本機建置成功時會自動更新，有變動時記得一起 commit。`deploy.yml` 每天台灣時間 02:00 自動重建一次。
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

文章頁：標題夠多時顯示目錄、標題旁有 `#` 連結、程式碼區塊有「複製」按鈕、底部有上一篇／下一篇，左下角的原版經驗條顯示閱讀進度（讀到底會「叮」一聲）。
文章裡想放小圖示時用原版物品圖代替 Emoji：`<img class="mc-item" src="/mc/item/cake.png" alt="" />`。

**站內搜尋**：`npm run build` 最後用 [Pagefind](https://pagefind.app) 為文章本文（`data-pagefind-body`）建立索引，`/blog/` 的搜尋欄在瀏覽器端搜尋，中文也能搜。開發模式（`npm run dev`）沒有索引，搜尋欄會顯示提示；要測試請 `npm run build && npm run preview`。網址可以帶 `?q=關鍵字`。

## 作品集

`/portfolio/`（英文 `/en/portfolio/`）列出 `src/consts.ts` 的 `PORTFOLIO` 裡的 GitHub 專案。介紹寫在設定裡（中英文各一份），語言、星數、更新時間與網站連結在建置時從 GitHub API 抓；抓不到時只顯示介紹與連結。只放公開 repo：清單裡的 repo 若變成私人或被刪除，建置時會自動略過。

## 文章留言

文章頁底部用 [giscus](https://giscus.app/zh-TW)：留言存在這個 repo 的 GitHub Discussions（Announcements 分類），訪客用 GitHub 帳號登入留言。設定在 `src/consts.ts` 的 `GISCUS`。
第一次使用要安裝 giscus App：https://github.com/apps/giscus （選擇只給這個 repo）。

## 進度與彩蛋

- **進度**：定義在 `src/lib/advancements.ts`，達成時右上角跳出「進度達成！」，關於我頁面可以看到全部進度。目前有：歡迎光臨、探險家、DJ 皮皮、夜貓子、交個朋友、附魔師、書蟲、迷路了、這不算作弊吧？。紀錄存在訪客自己的瀏覽器裡。
- **附魔書**：關於我頁面的文字用附魔台的銀河字母顯示，點一下會逐字解讀。
- **404 死亡畫面**：找不到的網址會顯示「你死了！」、隨機死因與「分數：404」，按鈕 1 秒後才能按（同遊戲），並解鎖「迷路了」進度。
- **原版物品提示框**：滑鼠移到統計資料、進度、附魔書與右下角按鈕上會出現深紫色的原版提示框。其他元素加上 `data-tooltip`（與 `data-tooltip-lines`）即可使用。
- **換頁讀取畫面**：換頁超過 0.15 秒時顯示「正在載入地形…」與泥土背景。
- **聊天列指令**：電腦上按 `T` 開聊天、按 `/` 直接打指令（Tab 自動完成、↑↓ 輸入紀錄、Esc 關閉）。有 `/help`、`/time set day|night`、`/weather`、`/give @s <物品>`、`/tp <頁面>`、`/music on|off|next`、`/search <關鍵字>`、`/say`、`/seed`、`/kill`、`/clear`。解析在 `src/lib/commands.ts`、執行在 `src/lib/command-runner.ts`。
- **天氣**：背景跟著台北的實際天氣（[Open-Meteo](https://open-meteo.com)，免金鑰，快取 15 分鐘）下雨、下雪或打雷，用的是原版雨雪材質；查不到就是晴天。地點在 `src/consts.ts` 的 `WEATHER`。開啟「減少動態效果」時只會變陰天、不會下雨。
- **Twitch 開台通知**：瀏覽器端向 [decapi.me](https://decapi.me) 查詢是否開台（免金鑰，快取 3 分鐘）。開台時跳出通知、標語換成「正在直播！」、直播按鈕出現 LIVE 標籤；查不到就當作沒開台。
- **音樂面板**：右下角音符按鈕的面板有唱片機曲目清單（點一下播放）與單曲循環開關。

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
