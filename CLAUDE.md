# CLAUDE.md — 《這個標點符號誰放的？》（第一章：國王的遺囑只有一個逗號）/ Royal Comma

## Project contract / 專案不可變原則
- **先讀 `START_HERE.md`、`docs/HANDOFF.md`、`docs/ARCHITECTURE.md`、`docs/ROADMAP.md`，再閱讀實際程式碼。**
- 本專案已有可玩的 v4.0，不要從零重做，不要把現有作品改成單純展示頁，也不要在沒有驗證與明確理由時改用 React / Phaser。
- 繁體中文、荒謬宮廷官僚黑色幽默、單機離線網頁遊戲；故事與機制比炫技更重要。
- 逗號可插在字首、字尾或任意字間；每關僅有 **2 個不公開的有效位置**（第二章可選逗號或問號、只能放一個；仍只有 2 種有效解讀，`also` 只用來收納意思相同的同義擺法）；錯位 +1 混亂，該關重來。不要在提交前提示哪個是正確答案。
- **絕對不要重新加入「本回合委託」或其他洩漏答案的指示。** 玩家應猜測哪種解讀更混亂，並承擔政治後果。
- 八關順序依 seed 打亂，遊戲有勝敗、得分與結局；保留高風險／保守選擇的取捨。
- 7 點混亂亡國，必須在進遊戲前告知。
- 音樂保留「無奈、荒謬、略顯笨拙的滑稽宮廷感」，目前 BGM 為原創 `audio/tired_royal_march.mp3`。使用者提供的參考音檔只用作**風格參考**，不得取樣、改編其辨識性旋律或直接加入發行包。
- 結局要參照當局所有有效選擇、選擇發生順序、跨關連鎖與退件歷史；避免互相矛盾的敘事。不要宣稱 256 篇結局是獨立寫作：v4.1 起是 16 個分支片段＋`src/world.mjs` 的 35 條有先後條件的因果鏈組合而成。
- v4.1 起，先前的命令會在後續關卡的「宮廷速報」與判決畫面的「連鎖反應」中出現；**只改劇情、不改數值**（見 `docs/DECISIONS.md`）。速報只能寫已發生的事，不得洩漏本關解讀。
- 新增或改寫聖旨時，有效位置不可再形成固定規律（見 `tests/world.test.mjs` 的多樣性測試）。
- 第二章「金幣商會」（`content/guild.json`、`src/guild.mjs`）：6 份合約，每章各自計分、混亂從 0 開始，跨章只延續劇情（`prelude`）。第三章「大教廷」尚未製作。
- 保留單一可離線開啟的 HTML 發行形式。可以改進原始碼組織，但不得破壞既有單檔建置。

## Tooling and location
- Node.js >=18，原始碼是 **原生 ESM JavaScript**、HTML、CSS；不需要 npm install。
- `npm test` 執行 Node 內建測試；`npm run build` 生成 `dist/index.html` 及根目錄單檔 HTML；`npm run dev` 啟動本機 HTTP server。
- `python scripts/browser-verify-v4.py`、`browser-verify-v41.py`、`browser-verify-v42.py` 是可選的 Playwright 瀏覽器驗證；預設用 Playwright 內建 Chromium，可用環境變數 `CHROMIUM_PATH` 指定其他瀏覽器。
- 核心：`src/engine.mjs`；世界狀態與因果鏈：`src/world.mjs`（第一章）、`src/guild.mjs`（第二章）；敘事：`src/epilogue.mjs`；介面／音訊：`src/app.mjs`；樣式：`src/styles.css`；關卡：`content/levels.json`。
- `src/shell.html` + `scripts/build.mjs` 內嵌 CSS/JS/MP3；請編修來源，不要直接編修建置產物。

## Workflow and truthfulness
1. 開始前先做審查：閱讀程式、執行 baseline 測試、檢查 UI、提出真正的漏洞與可改善處。
2. 未經明確指定不要推翻玩法或計分。若有重大變更，先在 `docs/DECISIONS.md` 記錄決策與相容性影響。
3. 每個修改都應新增／更新測試，重跑 `npm test`、`npm run build`；可用時進行瀏覽器實玩（至少通關與亡國各一次）。
4. 修復敘事矛盾時，應優先確保情節因果、人物狀態與事件先後自洽，不要只增加隨機笑話或形容詞。
5. 改進 BGM 須保持原創；如更換音樂，保留播放控制與 Web Audio 互動限制。
6. 如沒有跑過瀏覽器或音樂沒有實際聆聽，請如實列為未驗證。
7. 在 `docs/PROGRESS.md` 記錄實際修改、實際執行命令、結果、剩餘問題與下一步。不要未經要求自動部署或 push 到遠端。
