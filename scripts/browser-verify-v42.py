"""v4.2 browser acceptance (chapter 2 — 金幣商會). Run after `npm run build`.
Set CHROMIUM_PATH to use a system browser; otherwise Playwright's bundled Chromium is used."""
import asyncio, json, os, pathlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL=(ROOT/'dist/index.html').as_uri()
ROYAL={l['title']:l for l in json.loads((ROOT/'content/levels.json').read_text())['levels']}
GUILD={l['title']:l for l in json.loads((ROOT/'content/guild.json').read_text())['levels']}
ROYAL_PICK={'L08':'B','L04':'B','L07':'B'}   # sets up cross-chapter facts: prince broke, king scammed, potion stock
GUILD_PICK={'G06':'B','G04':'B'}             # 收禮合法 (國王的中獎通知)、加倍分紅 (打嗝紀念品)
low=lambda l: min(l['choices'],key=lambda c:c['chaosDelta'])

def steps(choice):
    # v4.4: chapter 2/3 readings are several placements; chapter 1 is a single comma.
    return [(p['mark'],p['at']) for p in choice['placements']] if 'placements' in choice else [(choice.get('mark','，'),choice['insertAfter'])]

async def place(page,choice,tap=False):
    for mark,at in steps(choice):
        if await page.locator('.mark-picker').count():
            loc=page.locator(f'[data-action=mark][data-mark="{mark}"]')
            await (loc.tap() if tap else loc.click())
        loc=page.locator(f'[data-action=select][data-position="{at}"]')
        await (loc.tap() if tap else loc.click())

async def play(page,table,picks,log):
    while await page.locator('.stage-title').count():
        level=table[await page.locator('.stage-title').inner_text()]
        choice=next((c for c in level['choices'] if c['id']==picks.get(level['id'])),None) or low(level)
        await place(page,choice)
        await page.click('[data-action=judge]')
        quote=await page.locator('.judgment-quote').inner_text()
        assert quote==choice['rendered'],(quote,choice['rendered'])
        chains=await page.locator('.chain-reaction h4').all_inner_texts() if await page.locator('.chain-reaction').count() else []
        log.append({'stage':level['id'],'choice':choice['id'],'quote':quote,'chains':chains})
        await page.click('[data-action=advance]')

async def run():
    report={}
    async with async_playwright() as p:
        launch={'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
        browser=await p.chromium.launch(**launch,headless=True,args=['--autoplay-policy=no-user-gesture-required'])
        errors=[]
        page=await browser.new_page(viewport={'width':1366,'height':900})
        page.on('pageerror',lambda e:errors.append(str(e)))

        # 1) Win chapter 1, continue into chapter 2 with its history as prelude.
        await page.goto(URL); await page.fill('#seed-input','V42-CONT'); await page.click('[data-action=start]')
        assert await page.locator('.mark-picker').count()==0,'chapter 1 must not offer a question mark'
        royal_log=[]; await play(page,ROYAL,ROYAL_PICK,royal_log)
        assert '你讓王國勉強活下來' in await page.locator('body').inner_text()
        await page.click('[data-action=guild-continue]')
        first=await page.locator('.court-briefing').inner_text()
        assert '王宮' in first and '兩個符號' in first,first
        assert await page.locator('.mark-picker [data-action=mark]').count()==2
        await page.screenshot(path=str(ROOT/'docs/v42-guild-desktop.png'),full_page=True)
        guild_log=[]
        while await page.locator('.stage-title').count():
            level=GUILD[await page.locator('.stage-title').inner_text()]
            choice=next((c for c in level['choices'] if c['id']==GUILD_PICK.get(level['id'])),None) or low(level)
            await place(page,choice); await page.click('[data-action=judge]')
            chains=await page.locator('.chain-reaction h4').all_inner_texts() if await page.locator('.chain-reaction').count() else []
            guild_log.append({'stage':level['id'],'choice':choice['id'],'quote':await page.locator('.judgment-quote').inner_text(),'chains':chains})
            if '國王送來的中獎通知' in chains:
                await page.screenshot(path=str(ROOT/'docs/v42-cross-chain-desktop.png'),full_page=True)
            await page.click('[data-action=advance]')
        all_chains=[c for e in guild_log for c in e['chains']]
        assert '國王送來的中獎通知' in all_chains and '打嗝紀念品' in all_chains,all_chains
        body=await page.locator('body').inner_text()
        assert '你讓商會勉強撐過一年' in body and 'YOUR GUILD ANNUAL REPORT' in body
        story=await page.locator('.chronicle-book').inner_text()
        assert '國王送來的中獎通知' in story and '王宮' in story
        report['continue']={'royal':royal_log,'guild':guild_log}

        # 2) Direct start from the menu: no prelude; keyboard switches marks; exactly two marks are required.
        await page.goto(URL); await page.fill('#seed-input','V42-DIRECT'); await page.click('[data-action=guild-start]')
        first=await page.locator('.court-briefing').inner_text()
        assert '王宮' not in first and '借調' in first,first
        level=GUILD[await page.locator('.stage-title').inner_text()]
        await page.keyboard.press('2')
        assert await page.get_attribute('[data-action=mark][data-mark="？"]','aria-checked')=='true'
        end=len(level['raw'])
        await page.click('[data-action=select][data-position="0"]')
        assert await page.locator('[data-action=judge]').is_disabled(),'one mark must not be enough'
        assert '1</b> / 2' in await page.locator('.mark-count').inner_html()
        await page.click(f'[data-action=select][data-position="{end}"]')
        preview=await page.locator('.punctuation-preview strong').inner_text()
        assert preview=='？'+level['raw']+'？',preview
        await page.click('[data-action=select][data-position="2"]')  # a third mark is refused
        assert await page.locator('.comma-slot--chosen').count()==2
        await page.click('[data-action=select][data-position="0"]')  # same mark again removes it
        assert await page.locator('.comma-slot--chosen').count()==1
        await page.click('[data-action=select][data-position="0"]')
        await page.click('[data-action=judge]')
        rejected=await page.locator('.judgment-card--invalid').count()==1
        assert rejected,(level['id'],'？ at the very start is never a valid reading')
        await page.keyboard.press('1')  # ignored outside editing
        report['direct']={'stage':level['id'],'rejected':rejected}
        # Seven misplaced marks bankrupt the guild.
        await page.goto(URL); await page.fill('#seed-input','V42-BANKRUPT'); await page.click('[data-action=guild-start]')
        for _ in range(7):
            await page.click('[data-action=mark][data-mark="？"]'); await page.click('[data-position="0"]'); await page.click('[data-position="1"]')
            await page.click('[data-action=judge]'); await page.click('[data-action=advance]')
        body=await page.locator('body').inner_text()
        assert '你讓商會倒閉了' in body and '已執行 0 份合約、退件 7 次' in body,body[:300]
        report['bankruptcy']=True

        # 3) Mobile: picker reachable and large enough, stamp fixed, no overflow on menu/game/ending.
        mobile=await browser.new_page(viewport={'width':390,'height':844},has_touch=True)
        mobile.on('pageerror',lambda e:errors.append(str(e)))
        await mobile.goto(URL)
        assert not await mobile.evaluate('document.documentElement.scrollWidth>innerWidth'),'menu overflow'
        await mobile.fill('#seed-input','V42-MOBILE'); await mobile.locator('[data-action=guild-start]').tap()
        await mobile.wait_for_selector('.cutscene--chapter',state='detached'); await mobile.wait_for_timeout(600)  # v4.6 title card
        boxes=[await b.bounding_box() for b in await mobile.locator('[data-action=mark]').all()]
        assert all(b['height']>=44 for b in boxes),boxes
        level=GUILD[await mobile.locator('.stage-title').inner_text()]
        c=level['choices'][0]
        await place(mobile,c,tap=True)
        stamp=await mobile.locator('[data-action=judge]').bounding_box()
        assert stamp['y']+stamp['height']<=844,stamp
        assert not await mobile.evaluate('document.documentElement.scrollWidth>innerWidth'),'game overflow'
        await mobile.screenshot(path=str(ROOT/'docs/v42-guild-mobile.png'))
        await mobile.locator('[data-action=judge]').tap(); await mobile.locator('[data-action=advance]').tap()
        await play(mobile,GUILD,{},[])
        assert not await mobile.evaluate('document.documentElement.scrollWidth>innerWidth'),'ending overflow'
        report['mobile']={'markButtons':boxes,'stamp':stamp}
        # 4) Onboarding: start button above the fold, demo teaches valid/invalid, first-time coach only once.
        onboarding={}
        for w,h in ((1366,768),(390,844)):
            fresh=await browser.new_page(viewport={'width':w,'height':h})
            fresh.on('pageerror',lambda e:errors.append(str(e)))
            await fresh.goto(URL)
            cta=await fresh.locator('[data-action=start]').bounding_box()
            assert cta['y']+cta['height']<=h,(w,cta)
            await fresh.click('[data-action=demo][data-demo="3"]')
            ok=await fresh.locator('.demo-result').inner_text()
            await fresh.click('[data-action=demo][data-demo="1"]')
            bad=await fresh.locator('.demo-result').inner_text()
            assert '讀得通' in ok and '退件' in bad,(ok,bad)
            await fresh.click('[data-action=start]')
            assert '第一步' in await fresh.locator('.coach').inner_text()
            await fresh.click('[data-position="0"]')
            assert '第二步' in await fresh.locator('.coach').inner_text()
            await fresh.click('[data-action=judge]')
            assert await fresh.locator('.coach--judgment').count()==1
            await fresh.click('[data-action=advance]')
            assert await fresh.locator('.coach').count()==0,'coach must only appear on the first decree'
            await fresh.goto(URL); await fresh.click('[data-action=start]')
            assert await fresh.locator('.coach').count()==0,'coach must not return after the tutorial was seen'
            onboarding[w]={'ctaBottom':cta['y']+cta['height']}
            await fresh.close()
        report['onboarding']=onboarding
        assert not errors,errors
        report['pageErrors']=errors
        await browser.close()
    (ROOT/'docs/v42-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:(v if k!='continue' else {'guildChains':[c for e in v['guild'] for c in e['chains']]}) for k,v in report.items()},ensure_ascii=False,indent=2))
asyncio.run(run())
