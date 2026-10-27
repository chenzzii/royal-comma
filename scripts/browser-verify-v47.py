"""v4.7 browser acceptance: 8-bit outcome illustrations on chapter 1 judgments. Run after `npm run build`.
Set CHROMIUM_PATH to use a system browser; otherwise Playwright's bundled Chromium is used."""
import asyncio, json, os, pathlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL=(ROOT/'dist/index.html').as_uri()
ROYAL={l['title']:l for l in json.loads((ROOT/'content/levels.json').read_text())['levels']}

async def run():
    report={'scenes':[]}
    async with async_playwright() as p:
        launch={'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
        browser=await p.chromium.launch(**launch,headless=True)
        errors=[]
        for w,h in ((1366,900),(390,844)):
            page=await browser.new_page(viewport={'width':w,'height':h})
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.goto(URL); await page.fill('#seed-input','V47'); await page.click('[data-action=start]')
            await page.wait_for_selector('.cutscene',state='detached')
            n=0
            while await page.locator('.stage-title').count():
                level=ROYAL[await page.locator('.stage-title').inner_text()]
                c=level['choices'][n%2]
                if n==1:  # a misplaced comma shows no illustration
                    bad=next(i for i in range(12) if i not in [x['insertAfter'] for x in level['choices']])
                    await page.click(f'[data-action=select][data-position="{bad}"]'); await page.click('[data-action=judge]')
                    assert await page.locator('.scene-art').count()==0
                    await page.click('[data-action=advance]')
                await page.click(f'[data-action=select][data-position="{c["insertAfter"]}"]'); await page.click('[data-action=judge]')
                assert await page.locator('.scene-art svg.pixel-scene').count()==1
                label=await page.get_attribute('.scene-art svg','aria-label'); assert label==c['headline'],(label,c['headline'])
                if w==1366: report['scenes'].append(f"{level['id']}:{c['id']}")
                if n==2:
                    await page.wait_for_timeout(900)
                    await page.locator('.story-banner').screenshot(path=str(ROOT/f'docs/v47-scene-{"desktop" if w>500 else "mobile"}.png'))
                    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                await page.click('[data-action=advance]'); n+=1
            await page.close()
        # v4.8: chapter 2 and 3 judgments carry illustrations too.
        page=await browser.new_page(); await page.goto(URL); await page.click('[data-action=guild-start]')
        await page.click('.cutscene--chapter')
        await page.click('[data-action=mark][data-mark="，"]')
        for pos in (0,1): await page.click(f'[data-action=select][data-position="{pos}"]')
        await page.click('[data-action=judge]'); assert await page.locator('.scene-art').count()==0,'misplaced marks: no art'
        for chapter,table in (('guild','guild.json'),('cathedral','cathedral.json')):
            levels={l['title']:l for l in json.loads((ROOT/'content'/table).read_text())['levels']}
            await page.goto(URL); await page.click(f'[data-action={chapter}-start]'); await page.click('.cutscene--chapter')
            k=0
            while await page.locator('.stage-title').count():
                level=levels[await page.locator('.stage-title').inner_text()]; c=level['choices'][k%2]
                for pl in c['placements']:
                    await page.click(f'[data-action=mark][data-mark="{pl["mark"]}"]'); await page.click(f'[data-action=select][data-position="{pl["at"]}"]')
                await page.click('[data-action=judge]')
                assert await page.get_attribute('.scene-art svg','aria-label')==c['headline']
                report['scenes'].append(f"{level['id']}:{c['id']}")
                if k==1: await page.wait_for_timeout(900); await page.locator('.story-banner').screenshot(path=str(ROOT/f'docs/v48-scene-{chapter}.png'))
                await page.click('[data-action=advance]'); k+=1
        assert not errors,errors
        await browser.close()
    print(json.dumps(report,ensure_ascii=False))
asyncio.run(run())
