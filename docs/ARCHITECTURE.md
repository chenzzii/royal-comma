# 專案技術與資料架構

## 資料流程
`content/levels.json` → `src/engine.mjs` 狀態 → `src/app.mjs` DOM 互動與繪製 → `src/epilogue.mjs` 結局故事。
`src/shell.html` + `src/styles.css` + 上述 JS + MP3 → `scripts/build.mjs` → `dist/index.html` 和根目錄 `國王的遺囑_可玩版.html`。

## 功能責任
- `src/engine.mjs`: 純函式；`newGame`, `selectPosition`, `judgeChoice`, `advanceGame`, `generateOrder`, `validateGameData`, `canSurviveAll`。不應包含 DOM。
- `src/epilogue.mjs`: `makeChronicle`, `CHRONICLE`, `CROSSOVERS`；按歷史生成結局。
- `src/app.mjs`: 狀態與呈現、鍵盤／點擊事件、音訊、localStorage、複製與下載；保留 XSS escape 機制。
- `src/styles.css`: 響應式羊皮紙、判決、結局畫面。
- `src/shell.html`: 靜態入口 HTML 模板。
- `content/levels.json`: 8 關與正式數值；所有內容配置變更應與校驗器同步。
- `scripts/build.mjs`: 建置無依賴單檔，將音樂 base64 內嵌。音樂增長會顯著增加 HTML 體積。
- `scripts/make-bgm.py`: 使用 Python/NumPy 產生 WAV 再以 FFmpeg 編成 MP3；僅改曲時需要。
- `scripts/browser-verify-v4.py`: Playwright + Chromium 自動跑勝利、失敗、跨關、TXT、手機。
- `tests/engine.test.mjs`, `tests/epilogue.test.mjs`: Node 內建測試（不是 Vitest）。

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
