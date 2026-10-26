# v4.0 完成紀錄

- 新原創荒謬宮廷配樂約 66.6 秒，MP3 內嵌單檔 HTML
- 新增 16 分支故事、12 組跨關連動和順序依賴、雙結局
- 16 項單元測試成功
- Chromium 八關勝利、七次退件失敗、熊公主跨關連動、複製及TXT下載成功
- 390px 手機遊戲頁和結局頁沒有水平溢出
- 詳細瀏覽器報告：docs/v4-browser-report.json


## 交接補充（2026-10-26）
- 交接時再跑 16 項 `npm test`，全部通過。
- 交接時再跑 `npm run build`，產物 SHA 與 v4.0 發行版相同。
- 交接時再跑 `scripts/browser-verify-v4.py`，成功。
- 下一階段尚未實作；請 Claude 自行審查後依計畫更新。

---

# v4.1 開發紀錄（2026-10-26）

## 實際修改
| 檔案 | 內容 |
|---|---|
| `content/levels.json` | 八句聖旨改寫：11–14 字，有效位置不再固定在第 4、6 字（見 `DECISIONS.md` D-001）；結果、分數、混亂值不變 |
| `src/world.mjs`（新增） | 純函式世界狀態：`traceWorld`、`latestReactions`、`courtBriefing`；35 條因果鏈（`CHAINS`）、26 條宮廷速報、16 條後續影響 |
| `src/epilogue.mjs` | 跨關段落改由 `traceWorld` 產生：依實際順序、全部列出（移除 4 條上限）、不重複判決原文；尾聲依公主實際位置描述 |
| `src/app.mjs` | 宮廷速報卡片；判決畫面「連鎖反應」區塊；敗北「已執行 N 份」少 1 修正；補上 `insertComma` import；重繪後還原焦點；Web Audio 無縫循環 BGM＋音量設定 |
| `src/styles.css` | 新區塊樣式；逗號點擊區兩側各加寬 10px；≤860px 時「蓋印章」固定在畫面底部；修正花紋遮住「第 1 號敕令」 |
| `scripts/build.mjs` | 依序內嵌全部模組；建置時做語法解析檢查，避免模組間名稱衝突 |
| `scripts/browser-verify-v4.py` | Chromium 路徑改為可用 `CHROMIUM_PATH` 指定，未指定時用 Playwright 內建；音樂檢查改看 `window.__royalMusic()` |
| `scripts/browser-verify-v41.py`（新增） | v4.1 瀏覽器驗收 |
| `tests/world.test.mjs`（新增） | 10 項新測試 |
| `tests/engine.test.mjs` | 熊公主測試改讀資料中的位置（原本寫死第 4 格） |

## 實際執行的命令與結果
- `npm test`：**26/26 通過**（原 16 項＋新 10 項）。
- `npm run build`：成功，`dist/index.html` 與 `國王的遺囑_可玩版.html` 約 1504 KiB。
- `python3 scripts/browser-verify-v4.py`（Playwright 內建 Chromium）：通過。八關勝利、七次退件亡國、熊公主跨關、複製與 TXT、390px 無溢出、無頁面錯誤；BGM 模式為 `webaudio`。
  - 注意：這支腳本會覆寫 `docs/v4-*.png` 與 `docs/v4-browser-report.json`，所以這些檔案現在是 v4.1 的畫面。
- `python3 scripts/browser-verify-v41.py`：通過，報告在 `docs/v41-browser-report.json`。
  - 種子 `V41-0`（先救魔王、再結婚）：在 L06 判決畫面看到「熊公主即位（魔界聯姻特別篇）」。
  - 種子 `V41-1`（先結婚、再救魔王）：在 L01 判決畫面看到「熊公主即位（新婚救夫篇）」。兩局都通關，結局也包含該段落。
  - 第一關顯示開場速報，之後各關顯示依前情產生的速報。
  - 焦點：點逗號後焦點留在該格，方向鍵移動後焦點跟著被選的格子。
  - BGM：`webaudio` 模式，循環 66.207 秒；開關可停止與恢復；音量從 45% 調到 20% 有效。
  - 高混亂合法命令導致亡國：畫面顯示「已執行 5 份」，與實際相符。七次錯位亡國：顯示「已執行 0 份聖旨、退件 7 次」。
  - 390px：點逗號格右側 8px 仍命中該格；「蓋印章」固定在畫面底部（y≈761），不用捲動；遊戲與長篇結局都沒有水平溢出。
- BGM 循環接點數值分析（ffmpeg 解碼後模擬同一演算法）：接點跳動 0.0005，樣本間中位差為 0.0137，沒有爆音，峰值不變。舊版接點有約 192 毫秒靜音。

## 尚未驗證
- **BGM 實際聽感**：循環接點、新音量、音色都沒有真人聆聽。
- 真實手機（iOS Safari、Android Chrome）的觸控與固定按鈕、iOS 靜音開關對 Web Audio 的影響。
- 新句子的語感，以及誘答位置是否太刁鑽：需要真人試玩，尤其是「從今天起，」「國王說，」這類位置。
- 35 條連鎖文字的笑點品質：已用程式檢查因果與時序，但幽默感需要人讀。

## 下一步建議（v4.2 候選）
- 不同句構的聖旨與關卡題庫（目前仍是「否定範圍」句型家族，兩個有效位置固定相隔兩字）。
- 結局 `CHRONICLE` 的 16 段基本文字仍與判決畫面的笑話重複，可改寫成史官口吻。
- 若日後要讓連鎖影響混亂值，需先在 `DECISIONS.md` 記錄（目前的決定是只改劇情）。

## v4.1 追加：開場設定修正（2026-10-26）
- 依使用者選擇，國王從「已駕崩」改為「活著，但預立遺囑並依規定生前試行」（`DECISIONS.md` D-005）。
- 修改：`src/app.mjs` 主選單開場、`src/shell.html` 網頁描述、`src/epilogue.mjs` 三段 `INTROS`、`src/world.mjs` 第一關宮廷速報、`docs/HANDOFF.md` 遊戲定位。
- 新測試：掃描玩家可見文字不得出現「駕崩」等字眼，並確認主選單有「生前試行」設定。
- 結果：`npm test` 27/27 通過；`npm run build` 成功；`browser-verify-v4.py`、`browser-verify-v41.py` 都通過。新的主選單截圖存為 `docs/v41-menu-desktop.png`。

## 改名與手機選單修正（2026-10-26）
- 遊戲名稱改為《這個標點符號誰放的？》，「國王的遺囑只有一個逗號」改為第一章名稱：主選單標題與標頭小字、`<title>`、網頁描述、README、CLAUDE.md。
- 修正 v4.0 就存在的手機主選單溢出：390px 時兩張卡片超出 9px，改用 `minmax(0,1fr)`。`browser-verify-v41.py` 增加主選單溢出檢查。
- `npm test` 27/27 通過；`npm run build` 成功；兩支瀏覽器腳本都通過；320px 與 390px 主選單都沒有溢出。

---

# v4.2 開發紀錄（2026-10-26）：第二章「金幣商會」

## 實際修改
| 檔案 | 內容 |
|---|---|
| `src/engine.mjs` | 支援 `data.marks`（，／？）、`selectMark`、`insertMark`、解讀的同義擺法 `also`、章節 `id`、通用回合數、`prelude`（前一章歷史）；第一章行為不變 |
| `src/world.mjs` | `traceWorld`／`latestReactions`／`courtBriefing` 可接受任一章的 world 與前情 |
| `content/guild.json`（新增） | 6 份合約：同位置不同符號（G03、G06）、兩個問號（G02、G05）、逗號對問號（G01）、兩個逗號（G04） |
| `src/guild.mjs`（新增） | 商會世界狀態、18 條連鎖（章內 10 條兩種順序＋跨章 8 條）、18 條速報、12 條後續、商會年報 |
| `src/app.mjs` | 章節文字表（第一章文字不變）、符號選擇器（滑鼠與 1／2 鍵）、主選單直接開始第二章、第一章通關後接續、商會結局、第二章最高分 |
| `src/styles.css` | 符號選擇器、章節入口、商會羊皮紙配色 |
| `scripts/build.mjs` | 內嵌 `GUILD_DATA` 與 `src/guild.mjs` |
| `tests/guild.test.mjs`（新增） | 9 項測試 |
| `scripts/browser-verify-v42.py`（新增） | 第二章瀏覽器驗收 |

## 實際執行的命令與結果
- `npm test`：**36/36 通過**。
- `npm run build`：成功，約 1545 KiB。
- `browser-verify-v4.py`、`browser-verify-v41.py`：第一章回歸測試都通過。
- `browser-verify-v42.py`：通過，報告在 `docs/v42-browser-report.json`。
  - 第一章通關後接續第二章：開場速報提到王宮；判決畫面出現跨章連鎖「國王送來的中獎通知」「一箱簽名照」；商會年報也收錄這些段落。
  - 從主選單直接開始：開場速報不提王宮。按鍵盤 2 可切換成問號；句尾問號依合約判定有效或退件。
  - 連續 7 次放錯：顯示「你讓商會倒閉了」「已執行 0 份合約、退件 7 次」。
  - 390px 手機：符號按鈕高 44px；蓋章按鈕固定在底部；主選單、遊戲頁、結局都沒有水平溢出；沒有頁面錯誤。

## 尚未驗證
- 第二章 6 句的語感與同義擺法是否合理，需要真人試玩。尤其要看玩家會不會覺得某些「看起來也對」的擺法被判錯。
- 真實手機、BGM 聽感（同 v4.1）。
