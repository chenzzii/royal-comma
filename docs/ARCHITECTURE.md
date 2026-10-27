# 專案技術與資料架構

## 資料流程
`content/levels.json` → `src/engine.mjs` 狀態 → `src/world.mjs` 依 `history` 推出世界事實與因果鏈 → `src/app.mjs` DOM 互動與繪製（宮廷速報、連鎖反應）→ `src/epilogue.mjs` 結局故事（同一份因果資料）。
`src/shell.html` + `src/styles.css` + 上述 JS + MP3 → `scripts/build.mjs` → `dist/index.html` 和根目錄 `國王的遺囑_可玩版.html`。

## 功能責任
- `src/engine.mjs`: 純函式；`newGame`, `selectPosition`, `judgeChoice`, `advanceGame`, `generateOrder`, `validateGameData`, `canSurviveAll`。不應包含 DOM。
- `src/world.mjs`（v4.1）: 純函式。`INITIAL_FACTS`、`WORLD_EFFECTS`（每個決定如何改變世界）、`CHAINS`（`on` 觸發於哪個決定、`after` 必須更早發生、可選 `when(facts)`；含 `judgment` 判決畫面文字與 `chronicle` 史官文字）、`BRIEFINGS`（下令前速報，`about` 標明來源決定）、`RIPPLES`；函式 `traceWorld`、`latestReactions`、`courtBriefing`。不看 seed 順序，只看實際執行順序。
- `src/guild.mjs`（v4.2）: 第二章 `GUILD_WORLD`（同樣的 initial/effects/chains/briefings/ripples/first 結構）與 `makeGuildChronicle`。`traceWorld(history, GUILD_WORLD, prelude)` 會先重播第一章 `prelude`，所以跨章連鎖可在 `after` 寫 `L0x:X`。
- `src/cathedral.mjs`（v4.3）: 第三章 `CATHEDRAL_WORLD`，`previous:[ROYAL_WORLD, GUILD_WORLD]`；`traceWorld` 會依序重播前兩章的前情。
- `content/guild.json`: 第二章資料；`marks` 列出可用符號，選項有 `mark` 與可選的 `also`（同義擺法）。
- `src/epilogue.mjs`: `makeChronicle`, `CHRONICLE`, `CROSSOVERS`（v4.1 起由 `CHAINS` 推得的唯讀檢視）；按歷史生成結局。
- `src/app.mjs`: 狀態與呈現、鍵盤／點擊事件、音訊、localStorage、複製與下載；保留 XSS escape 機制。
- `src/styles.css`: 響應式羊皮紙、判決、結局畫面。
- `src/shell.html`: 靜態入口 HTML 模板。
- `content/levels.json`: 8 關與正式數值；所有內容配置變更應與校驗器同步。
- `scripts/build.mjs`: 依 engine → world → epilogue → app 順序內嵌模組並做語法解析檢查（模組間頂層名稱不可重複），將音樂 base64 內嵌。音樂增長會顯著增加 HTML 體積。
- `scripts/make-bgm.py`: 使用 Python/NumPy 產生 WAV 再以 FFmpeg 編成 MP3；僅改曲時需要。
- `scripts/browser-verify-v4.py`: Playwright + Chromium 自動跑勝利、失敗、跨關、TXT、手機。
- `tests/engine.test.mjs`, `tests/epilogue.test.mjs`, `tests/world.test.mjs`: Node 內建測試（不是 Vitest）。
- `scripts/browser-verify-v41.py`: v4.1 驗收（兩種順序的連鎖、速報、敗北計數、手機固定按鈕與點擊區、焦點、音樂開關與音量）。請用 `page.goto(file://…)` 重新載入，不要對同一頁重複 `set_content`（會重複宣告頂層常數）。
- BGM：`src/app.mjs` 以 Web Audio 解碼內嵌 MP3，以 116 BPM × 32 小節的整小節長度循環並把尾音疊回開頭；失敗時退回 `<audio loop>`。`window.__royalMusic()` 只供自動化測試讀取播放狀態。

## 執行命令
```
node --version
npm test
npm run build
npm run dev
```

本機瀏覽 `http://127.0.0.1:4173/`；也可以直接雙擊根目錄遊戲 HTML。
如果要跑瀏覽器驗收，Python 環境需有 playwright，且本機有 Chromium，路徑可能不是 `/usr/bin/chromium`，請先確認並按需要更改腳本。

## 建議的改造方向
若開發新機制，先為歷史事件定義純函式的角色旗標／世界狀態（例如 `princessRescuedDemon`, `princessMarriedDemon`, `princeCaughtThief`），再讓下一關文字演出受世界狀態影響。切勿在 app 渲染函式裡透過字串搜尋、偶然順序與副作用實作劇情狀態。

為同 seed 同操作歷史保證可重現，任何額外隨機都需要源自 seed 的可測試 RNG。
