"""v4.6 browser acceptance: cutscenes (chapter card, stamp slam, finale). Run after `npm run build`.
Set CHROMIUM_PATH to use a system browser; otherwise Playwright's bundled Chromium is used."""
import asyncio, json, os, pathlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL=(ROOT/'dist/index.html').as_uri()
GUILD={l['title']:l for l in json.loads((ROOT/'content/guild.json').read_text())['levels']}

async def run():
    report={}
    async with async_playwright() as p:
        launch={'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
        browser=await p.chromium.launch(**launch,headless=True)
        errors=[]
        page=await browser.new_page(viewport={'width':1366,'height':900})
        page.on('pageerror',lambda e:errors.append(str(e)))
        # 1) Chapter card appears, names the chapter and rule, then removes itself.
        await page.goto(URL); await page.fill('#seed-input','V46'); await page.click('[data-action=guild-start]')
        card=await page.locator('.cutscene--chapter').inner_text()
        assert '第二章' in card and '2 個符號' in card,card
        await page.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=900})"); await page.screenshot(path=str(ROOT/'docs/v46-chapter-card.png'))
        await page.evaluate("document.getAnimations().forEach(a=>a.play())")
        await page.wait_for_selector('.cutscene',state='detached',timeout=4000)
        # 2) Clicking the card skips it at once.
        await page.goto(URL); await page.click('[data-action=cathedral-start]')
        await page.click('.cutscene--chapter'); assert await page.locator('.cutscene').count()==0
        # 3) Stamp slam after judging (valid) and a grey void stamp after a misplaced set.
        await page.goto(URL); await page.fill('#seed-input','V46'); await page.click('[data-action=guild-start]')
        await page.wait_for_selector('.cutscene',state='detached')
        level=GUILD[await page.locator('.stage-title').inner_text()]
        for pl in level['choices'][0]['placements']:
            await page.click(f'[data-action=mark][data-mark="{pl["mark"]}"]'); await page.click(f'[data-action=select][data-position="{pl["at"]}"]')
        await page.click('[data-action=judge]')
        assert await page.locator('.cutscene--stamp:not(.cutscene--void)').count()==1
        await page.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=320})"); await page.screenshot(path=str(ROOT/'docs/v46-stamp.png'))
        await page.evaluate("document.getAnimations().forEach(a=>a.play())")
        await page.wait_for_selector('.cutscene',state='detached',timeout=3000)
        await page.click('[data-action=advance]')
        assert await page.locator('main.scene-in').count()==1 and await page.locator('.cutscene').count()==0
        await page.click('[data-action=mark][data-mark="？"]')
        for pos in (0,1): await page.click(f'[data-action=select][data-position="{pos}"]')
        await page.click('[data-action=judge]'); assert await page.locator('.cutscene--void').count()==1
        # 4) Finale rain on defeat (seven misplaced contracts).
        while True:
            await page.click('[data-action=advance]')
            if not await page.locator('.mark-picker').count(): break
            await page.click('[data-action=mark][data-mark="？"]')
            for pos in (0,1): await page.click(f'[data-action=select][data-position="{pos}"]')
            await page.click('[data-action=judge]')
        assert await page.locator('.cutscene--finale.cutscene--lose i').count()==28
        await page.wait_for_selector('.cutscene',state='detached',timeout=8000)
        report['desktop']=True
        # 5) Reduced motion: no cutscene is visible at all.
        rm=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
        await rm.goto(URL); await rm.click('[data-action=start]')
        assert not await rm.locator('.cutscene--chapter').is_visible()
        await rm.click('[data-action=select][data-position="0"]')  # immediately clickable
        report['reducedMotion']=True
        assert not errors,errors
        await browser.close()
    print(json.dumps(report))
asyncio.run(run())
