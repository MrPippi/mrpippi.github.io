---
title: 太無聊了，所以用 Claude Code Vibe 了一個 Minecraft 標題畫面
description: 沒有企劃、沒有規格書，只有一個很閒的下午和一隻會寫程式的 AI。這是這個網站誕生的經過。
pubDate: 2026-10-10
draft: false
tags: [網站, Minecraft, Claude Code, 隨便寫寫]
---

```
<MrPippi> 好無聊
<MrPippi> 來做個人網站好了
<Claude> 好的！你想要什麼風格？
<MrPippi> Minecraft
```

就這樣，這個網站開始了。

## 起因：真的就是很無聊

其實這個 repo 四月底就建好了，然後放著長草長了半年。某天閒到發慌，打開終端機丟了一句「幫我把個人網站做成 Minecraft 標題畫面」給 Claude Code，接下來就是一路 Vibe 到底。

沒有 Figma、沒有需求文件，規格大概就是：

> 「要有那種會飄的雲」
> 「按鈕要像石頭」
> 「黃色那個會一直跳的字也要」

然後它就真的做出來了。

## 合成配方

如果把這個網站當成一個物品，合成表大概長這樣：

| 材料 | 用途 |
| --- | --- |
| <img class="mc-item" src="/mc/item/redstone.png" alt="" /> Astro × 1 | 輸出靜態網頁，丟上 GitHub Pages |
| <img class="mc-item" src="/mc/item/bundle.png" alt="" /> 原版素材 × 一小撮 | 按鈕、選單背景、太陽、月亮、雲 |
| <img class="mc-item" src="/mc/item/writable_book.png" alt="" /> 點陣字型 × 1 | 從遊戲的 `ascii.png` 字元表轉出來 |
| <img class="mc-item" src="/mc/item/music_disc_cat.png" alt="" /> Creative 曲目 × 好幾首 | 背景音樂，換頁也不會斷 |
| <img class="mc-item" src="/mc/item/command_block_minecart.png" alt="" /> Claude Code × 1 | 負責打字 |
| <img class="mc-item" src="/mc/item/name_tag.png" alt="" /> 我 × 1 | 負責說「好」、「不要」、「再大一點」 |

> **工作台輸出：** <img class="mc-item" src="/mc/item/map.png" alt="" /> mrpippi.github.io × 1

## Vibe Coding 的日常

整個過程大概是這樣循環：

1. 我：「這裡怪怪的」
2. Claude：改了
3. 我：「手機上壞掉了」
4. Claude：又改了
5. 回到第 1 步

看 commit 紀錄就知道，一半以上都是 `fix:`，什麼「頁尾在手機上蓋住選單」、「YouTube 擋掉 CI 抓不到影片」之類的。最後那個超經典：YouTube 不給 GitHub Actions 抓 RSS，只好先存一份影片清單當備案。這種事情，誰會想得到啦。

```
[16:42:08] [Server thread/WARN]: YouTube RSS feed returned 404
[16:42:09] [Server thread/INFO]: Falling back to committed snapshot
[16:42:09] [Server thread/INFO]: Done! For help, type "help"
```

（以上 log 是我捏造的，但心情是真的。）

## 死亡訊息

做的過程中被各種東西殺過幾次：

- MrPippi 被 CSS `z-index` 擊殺了
- MrPippi 試圖在手機上游泳，結果被版面擠死了
- MrPippi 被 YouTube 推下了懸崖
- MrPippi 被時區炸飛了（影片日期差了一天，因為建置的伺服器不在台灣）

不過沒關係，按一下「重生」就好。順帶一提，走錯路的話會看到這個網站自己的死亡畫面，有興趣可以亂打一個網址試試看。

## 藏起來的東西

網站裡偷偷放了幾個「進度」，達成時右上角會跳出熟悉的通知框：

> <img class="mc-item" src="/mc/item/knowledge_book.png" alt="" /> **進度達成！**
> 歡迎光臨

我不會全部講出來，給點提示就好：

- <img class="mc-item" src="/mc/item/music_disc_cat.png" alt="" /> 聽點音樂
- <img class="mc-item" src="/mc/item/clock_night.png" alt="" /> 天黑了也沒關係
- <img class="mc-item" src="/mc/item/lead.png" alt="" /> 交個朋友
- <img class="mc-item" src="/mc/item/book.png" alt="" /> 讀點東西（比如說，你現在正在做的事）
- <img class="mc-item" src="/mc/item/enchanted_book.png" alt="" /> 「關於我」頁面有一本附魔書，看得懂上面在寫什麼嗎？

完成度可以在「關於我」頁面下方看到，全部解鎖也不會有獎勵，但很有成就感（大概）。

## 下一步？

老實說沒什麼計畫。可能會寫寫插件開發的筆記，可能會放直播剪輯，也可能半年後才更新第二篇。

如果你看到這裡，那你已經拿到「書蟲」進度了。恭喜 <img class="mc-item" src="/mc/item/firework_rocket.png" alt="" />

```
/give @s minecraft:cake 1
```

<img class="mc-item" src="/mc/item/cake.png" alt="蛋糕" /> 拿去吧。

那就這樣，我們下篇見（如果有的話）。
