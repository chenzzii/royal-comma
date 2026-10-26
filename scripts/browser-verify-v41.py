"""v4.1 browser acceptance: causal chains in both orders, court briefing, defeat counter,
mobile stamp + tap targets, focus retention, music toggle/volume. Run after `npm run build`.
Set CHROMIUM_PATH to use a system browser; otherwise Playwright's bundled Chromium is used."""
import asyncio, json, os, pathlib, subprocess
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
HTML=(ROOT/'dist/index.html').read_text()
DATA=json.loads((ROOT/'content/levels.json').read_text())
BY_TITLE={l['title']:l for l in DATA['levels']}

def seeds_for_orders():
    # Ask the real engine for one seed where L01 precedes L06 and one where it follows.
    js="""import fs from 'node:fs';import {generateOrder} from './src/engine.mjs';
    const d=JSON.parse(fs.readFileSync('content/levels.json'));const out={};
    for(let i=0;i<500&&Object.keys(out).length<2;i++){const s='V41-'+i,o=generateOrder(s,d);out[o.indexOf(0)<o.indexOf(5)?'rescueFirst':'weddingFirst']??=s;}
    console.log(JSON.stringify(out));"""
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT,text=True))

async def start(page,seed):
    # A real file:// navigation per run (like double-clicking the HTML); set_content would
    # reuse the old JS realm and redeclare the bundle's top-level constants.
    await page.goto((ROOT/'dist/index.html').as_uri(),wait_until='load')
    await page.fill('#seed-input',seed)
    await page.click('[data-action=start]')

async def play_to_end(page,picker,log=None):
    while await page.locator('.stage-title').count():
        level=BY_TITLE[await page.locator('.stage-title').inner_text()]
        choice=picker(level)
        if log is not None:
            log.append({'stage':level['id'],'briefing':await page.locator('.court-briefing').inner_text()})
        await page.click(f'[data-action=select][data-position="{choice["insertAfter"]}"]')
        await page.click('[data-action=judge]')
        if log is not None and await page.locator('.chain-reaction').count():
            log[-1]['chain']=await page.locator('.chain-reaction h4').all_inner_texts()
        await page.click('[data-action=advance]')

async def run():
    seeds=seeds_for_orders()
    report={'seeds':seeds}
    async with async_playwright() as p:
        launch={'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
        browser=await p.chromium.launch(**launch,headless=True,args=['--autoplay-policy=no-user-gesture-required'])
        errors=[]
        page=await browser.new_page(viewport={'width':1366,'height':900})
        page.on('pageerror',lambda e:errors.append(str(e)))
        bear=lambda l: next(c for c in l['choices'] if c['id']=='B') if l['id'] in ('L01','L06') else min(l['choices'],key=lambda c:c['chaosDelta'])
        expected={'rescueFirst':'熊公主即位（魔界聯姻特別篇）','weddingFirst':'熊公主即位（新婚救夫篇）'}
        for label,seed in seeds.items():
            await start(page,seed)
            first=await page.locator('.court-briefing').inner_text()
            assert '一切如常' in first, first
            log=[]
            await play_to_end(page,bear,log)
            chains=[t for e in log for t in e.get('chain',[])]
            assert expected[label] in chains,(label,chains)
            assert '你讓王國勉強活下來' in await page.locator('body').inner_text()
            story=await page.locator('.chronicle-book').inner_text()
            assert expected[label] in story
            report[label]={'chains':chains,'briefings':[e['briefing'] for e in log]}
            if label=='rescueFirst':
                # Re-run to screenshot the judgment that carries the chain.
                await start(page,seed)
                while True:
                    level=BY_TITLE[await page.locator('.stage-title').inner_text()]
                    await page.click(f'[data-action=select][data-position="{bear(level)["insertAfter"]}"]')
                    await page.click('[data-action=judge]')
                    if level['id']=='L06':break
                    await page.click('[data-action=advance]')
                await page.screenshot(path=str(ROOT/'docs/v41-chain-desktop.png'),full_page=True)

        # Focus stays on the chosen slot; keyboard arrows move it.
        await start(page,seeds['rescueFirst'])
        await page.click('[data-action=select][data-position="2"]')
        focused=await page.evaluate("document.activeElement.dataset.position")
        await page.keyboard.press('ArrowRight')
        moved=await page.evaluate("[document.activeElement.dataset.position, document.querySelector('.comma-slot--chosen').dataset.position]")
        assert focused=='2' and moved==['3','3'],(focused,moved)
        report['focus']={'afterClick':focused,'afterArrow':moved}

        # Music: Web Audio loop, toggle off/on, volume from the rules dialog.
        await page.wait_for_function("window.__royalMusic().playing",timeout=15000)
        m1=await page.evaluate('window.__royalMusic()')
        await page.click('[data-action=music]')
        m2=await page.evaluate('window.__royalMusic()')
        await page.click('[data-action=music]')
        await page.wait_for_function("window.__royalMusic().playing",timeout=15000)
        await page.click('.topbar [data-action=help]')
        await page.fill('#music-volume','20')
        await page.dispatch_event('#music-volume','input')
        m3=await page.evaluate('window.__royalMusic()')
        assert m1['mode']=='webaudio' and abs(m1['loopSeconds']-66.2069)<0.01 and not m2['playing'] and abs(m3['volume']-0.2)<1e-6,(m1,m2,m3)
        report['music']={'start':m1,'afterToggleOff':m2,'afterVolume':m3}
        await page.keyboard.press('Escape')

        # Defeat by valid high-chaos decrees: executed count must match real history.
        await start(page,'HIGH-RISK')
        executed=0
        while await page.locator('.stage-title').count():
            level=BY_TITLE[await page.locator('.stage-title').inner_text()]
            hi=max(level['choices'],key=lambda c:c['chaosDelta'])
            await page.click(f'[data-action=select][data-position="{hi["insertAfter"]}"]')
            await page.click('[data-action=judge]'); executed+=1
            await page.click('[data-action=advance]')
        body=await page.locator('body').inner_text()
        assert '你搞丟了一個王國' in body and f'已執行 {executed} 份聖旨' in body,(executed,body[:400])
        report['valueDefeatExecuted']=executed

        # Seven misplaced commas.
        await page.click('[data-action=retry]')
        for _ in range(7):
            await page.click('[data-position="0"]'); await page.click('[data-action=judge]'); await page.click('[data-action=advance]')
        body=await page.locator('body').inner_text()
        assert '你搞丟了一個王國' in body and '已執行 0 份聖旨、退件 7 次' in body
        report['sevenInvalidDefeat']=True

        # Mobile: stamp reachable without scrolling, widened tap targets, no overflow, long ending.
        mobile=await browser.new_page(viewport={'width':390,'height':844},has_touch=True)
        mobile.on('pageerror',lambda e:errors.append(str(e)))
        await mobile.goto((ROOT/'dist/index.html').as_uri(),wait_until='load')
        assert not await mobile.evaluate('document.documentElement.scrollWidth>innerWidth'),'Mobile menu horizontal overflow'
        assert '這個標點符號' in await mobile.locator('h1').inner_text()
        await start(mobile,seeds['weddingFirst'])
        level=BY_TITLE[await mobile.locator('.stage-title').inner_text()]
        target=level['choices'][0]['insertAfter']
        slot=mobile.locator(f'[data-action=select][data-position="{target}"]')
        await slot.scroll_into_view_if_needed()
        box=await slot.bounding_box()
        # Tap 8px to the right of the slot's visible edge: must still hit the slot.
        hit=await mobile.evaluate("([x,y])=>document.elementFromPoint(x,y)?.dataset?.position??null",[box['x']+box['width']+8,box['y']+box['height']/2])
        assert hit==str(target),(hit,target)
        await mobile.tap(f'[data-action=select][data-position="{target}"]')
        stamp=await mobile.locator('[data-action=judge]').bounding_box()
        assert stamp['y']+stamp['height']<=844 and stamp['y']>600,stamp
        overflow=await mobile.evaluate('document.documentElement.scrollWidth>innerWidth')
        assert not overflow
        await mobile.screenshot(path=str(ROOT/'docs/v41-game-mobile.png'))
        await mobile.locator('[data-action=judge]').tap()
        await mobile.locator('[data-action=advance]').tap()
        await play_to_end(mobile,bear)
        assert await mobile.locator('.chronicle-book').count()==1
        assert not await mobile.evaluate('document.documentElement.scrollWidth>innerWidth')
        await mobile.screenshot(path=str(ROOT/'docs/v41-story-mobile.png'),full_page=True)
        report['mobile']={'tapHitRightOfSlot':hit,'stampBox':stamp,'overflow':overflow}
        assert not errors,errors
        report['pageErrors']=errors
        await browser.close()
    (ROOT/'docs/v41-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))
asyncio.run(run())
