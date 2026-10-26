# 開始接手：《國王的遺囑只有一個逗號》v4.0

這是一個**已可玩的專案交接包**，不是從零開始的設計素材。主要來源為 v4.0《荒謬宮廷史版》。

## 使用者怎麼操作
1. 將整包 ZIP 解壓縮到一個新資料夾，最好初始化 Git 作為基準快照。
2. 在該資料夾開啟終端機，執行 `npm test`、`npm run build`。Node.js 18+ 即可，**不需要 npm install**。
3. 雙擊 `國王的遺囑_可玩版.html` 試玩；或 `npm run dev` 然後開啟 `http://127.0.0.1:4173/`。
4. 以此資料夾作為 Claude Code 的工作目錄，先用 Plan Mode 貼上 `prompts/01_REVIEW_AND_PLAN.md`。
5. 看完審查與計畫，離開 Plan Mode，改貼 `prompts/02_CONTINUE_DEVELOPMENT.md`，讓 Claude 直接修改程式並測試。

## 交接文件
- `CLAUDE.md`：最重要的長期規則，防止 Claude 破壞玩法或誤判完成狀態。
- `docs/HANDOFF.md`：設計沿革、目前功能、遊戲數值與特殊限制。
- `docs/ARCHITECTURE.md`：模組與資料流程、如何建置和測試。
- `docs/ROADMAP.md`：建議優先處理的改進與驗收標準。
- `docs/QA_CHECKLIST.md`：如何驗證實際遊戲。
- `docs/v4-browser-report.json`：前次與本次瀏覽器自動化結果資料。
- `docs/PROGRESS.md`：接手後記錄實際變更的日誌。
- `docs/v4-*.png`：既有畫面截圖；不是要重畫的假想稿。

## 注意
1. 官方來源音樂參考（使用者提供的直笛音樂）**沒有隨包附入**。現有 `audio/tired_royal_march.mp3` 是先前自行創作的音樂。
2. `國王的遺囑_可玩版.html` 是建置產物；改程式請修改 `src/` 或 `content/`，然後重新執行 build。
3. 專案尚未部署到公開網址，也沒有雲端資料庫或登入。
