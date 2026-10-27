"""v4.3 browser acceptance (chapter 3 — 大教廷: comma, question or exclamation). Run after `npm run build`.
Plays chapters 1 → 2 → 3 in one session to check that decisions from BOTH earlier chapters reach chapter 3.
Set CHROMIUM_PATH to use a system browser; otherwise Playwright's bundled Chromium is used."""
import asyncio, json, os, pathlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL=(ROOT/'dist/index.html').as_uri()
load=lambda f:{l['title']:l for l in json.loads((ROOT/'content'/f).read_text())['levels']}
ROYAL,GUILD,CATH=load('levels.json'),load('guild.json'),load('cathedral.json')
PICKS={'L01':'B','L05':'B','L04':'A','L07':'B','G02':'B','G06':'B','C06':'A','C03':'B'}
low=lambda l: min(l['choices'],key=lambda c:c['chaosDelta'])

async def play(page,table,log=None):
    while await page.locator('.stage-title').count():
        level=table[await page.locator('.stage-title').inner_text()]
        choice=next((c for c in level['choices'] if c['id']==PICKS.get(level['id'])),None) or low(level)
        for mark,at in ([(p['mark'],p['at']) for p in choice['placements']] if 'placements' in choice else [(choice.get('mark','，'),choice['insertAfter'])]):
            if await page.locator('.mark-picker').count():
                await page.click(f'[data-action=mark][data-mark="{mark}"]')
            await page.click(f'[data-action=select][data-position="{at}"]')
        await page.click('[data-action=judge]')
        quote=await page.locator('.judgment-quote').inner_text()
        assert quote==choice['rendered'],(quote,choice['rendered'])
        chains=await page.locator('.chain-reaction h4').all_inner_texts() if await page.locator('.chain-reaction').count() else []
        if log is not None: log.append({'stage':level['id'],'choice':choice['id'],'chains':chains})
        if '熊公主扶起教宗' in chains: await page.screenshot(path=str(ROOT/'docs/v43-cross-chain-desktop.png'),full_page=True)
        await page.click('[data-action=advance]')

async def run():
    report={}
    async with async_playwright() as p:
        launch={'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
        browser=await p.chromium.launch(**launch,headless=True,args=['--autoplay-policy=no-user-gesture-required'])
        errors=[]
        page=await browser.new_page(viewport={'width':1366,'height':900})
        page.on('pageerror',lambda e:errors.append(str(e)))
        # 1) Chapter 1 → 2 → 3 in one run.
        await page.goto(URL); await page.fill('#seed-input','V43-SAGA'); await page.click('[data-action=start]')
        await play(page,ROYAL); assert '你讓王國勉強活下來' in await page.locator('body').inner_text()
        await page.click('[data-action=guild-continue]'); await play(page,GUILD)
        assert '你讓商會勉強撐過一年' in await page.locator('body').inner_text()
        await page.click('[data-action=cathedral-continue]')
        first=await page.locator('.court-briefing').inner_text()
        assert '王宮與商會' in first and '驚嘆號' in first,first
        assert await page.locator('.mark-picker [data-action=mark]').count()==3
        await page.screenshot(path=str(ROOT/'docs/v43-cathedral-desktop.png'),full_page=True)
        log=[]; await play(page,CATH,log)
        chains=[c for e in log for c in e['chains']]
        assert '熊公主扶起教宗' in chains and '可以轉送的贖罪' in chains,chains
        body=await page.locator('body').inner_text()
        assert '你讓教廷撐過了一年' in body and 'YOUR HOLY SEE ANNALS' in body
        story=await page.locator('.chronicle-book').inner_text()
        assert '商會' in story and '熊公主扶起教宗' in story
        assert await page.locator('[data-action=cathedral-continue]').count()==0
        report['saga']={'cathedral':log}

        # 2) Direct start: key 3 picks the exclamation mark; same slot with ，/！ gives different readings.
        await page.goto(URL); await page.fill('#seed-input','V43-DIRECT'); await page.click('[data-action=cathedral-start]')
        first=await page.locator('.court-briefing').inner_text()
        assert '王宮' not in first and '借調' in first,first
        await page.keyboard.press('3')
        assert await page.get_attribute('[data-action=mark][data-mark="！"]','aria-checked')=='true'
        await page.click('[data-action=select][data-position="0"]')
        assert (await page.locator('.punctuation-preview strong').inner_text()).startswith('！')
        await page.keyboard.press('1'); await page.click('[data-action=select][data-position="2"]')
        assert await page.locator('[data-action=judge]').is_disabled(),'two marks must not be enough in chapter 3'
        assert '2</b> / 3' in await page.locator('.mark-count').inner_html()
        report['direct']={'firstBriefing':first}
        # Seven misplaced marks split the church.
        await page.goto(URL); await page.fill('#seed-input','V43-SCHISM'); await page.click('[data-action=cathedral-start]')
        for _ in range(7):
            await page.click('[data-action=mark][data-mark="！"]')
            for pos in (0,1,2): await page.click(f'[data-position="{pos}"]')
            await page.click('[data-action=judge]'); await page.click('[data-action=advance]')
        body=await page.locator('body').inner_text()
        assert '你讓教會分裂了' in body and '已發布 0 份公告、退件 7 次' in body,body[:300]
        report['schism']=True

        # 3) Phones: three mark buttons fit, stamp pins only when ready, no overflow anywhere.
        sizes={}
        for w in (320,390):
            m=await browser.new_page(viewport={'width':w,'height':844},has_touch=True)
            m.on('pageerror',lambda e:errors.append(str(e)))
            await m.goto(URL)
            assert not await m.evaluate('document.documentElement.scrollWidth>innerWidth'),f'{w} menu overflow'
            await m.locator('[data-action=cathedral-start]').tap()
            assert '驚嘆號' in await m.locator('.coach').inner_text(),'first-time coach should mention the exclamation mark'
            boxes=[await b.bounding_box() for b in await m.locator('[data-action=mark]').all()]
            assert all(b['height']>=44 and b['x']>=0 and b['x']+b['width']<=w for b in boxes),boxes
            level=CATH[await m.locator('.stage-title').inner_text()]
            c=level['choices'][0]
            for p in c['placements']:
                await m.locator(f'[data-action=mark][data-mark="{p["mark"]}"]').tap()
                await m.locator(f'[data-action=select][data-position="{p["at"]}"]').tap()
            st=await m.locator('[data-action=judge]').bounding_box()
            assert st['y']+st['height']<=844
            assert not await m.evaluate('document.documentElement.scrollWidth>innerWidth'),f'{w} game overflow'
            if w==390: await m.screenshot(path=str(ROOT/'docs/v43-cathedral-mobile.png'))
            await m.locator('[data-action=judge]').tap(); await m.locator('[data-action=advance]').tap()
            await play(m,CATH)
            assert not await m.evaluate('document.documentElement.scrollWidth>innerWidth'),f'{w} ending overflow'
            sizes[w]={'markButtons':len(boxes)}
            await m.close()
        report['mobile']=sizes
        assert not errors,errors
        report['pageErrors']=errors
        await browser.close()
    (ROOT/'docs/v43-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))
asyncio.run(run())
