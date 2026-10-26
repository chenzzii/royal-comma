"""v4.2 browser acceptance (chapter 2 — 金幣商會). Run after `npm run build`.
Set CHROMIUM_PATH to use a system browser; otherwise Playwright's bundled Chromium is used."""
import asyncio, json, os, pathlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL=(ROOT/'dist/index.html').as_uri()
ROYAL={l['title']:l for l in json.loads((ROOT/'content/levels.json').read_text())['levels']}
GUILD={l['title']:l for l in json.loads((ROOT/'content/guild.json').read_text())['levels']}
ROYAL_PICK={'L08':'B','L04':'B','L07':'B'}   # sets up cross-chapter facts: prince broke, king scammed, potion stock
GUILD_PICK={'G02':'B','G03':'B'}             # 收禮合法 (國王的中獎通知)、會長催收 (一箱簽名照)
low=lambda l: min(l['choices'],key=lambda c:c['chaosDelta'])

async def place(page,choice):
    mark=choice.get('mark','，')
    if await page.locator('.mark-picker').count():
        await page.click(f'[data-action=mark][data-mark="{mark}"]')
    await page.click(f'[data-action=select][data-position="{choice["insertAfter"]}"]')

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
        assert '王宮' in first and '問號' in first,first
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
        assert '國王送來的中獎通知' in all_chains and '一箱簽名照' in all_chains,all_chains
        body=await page.locator('body').inner_text()
        assert '你讓商會勉強撐過一年' in body and 'YOUR GUILD ANNUAL REPORT' in body
        story=await page.locator('.chronicle-book').inner_text()
        assert '國王送來的中獎通知' in story and '王宮' in story
        report['continue']={'royal':royal_log,'guild':guild_log}

        # 2) Direct start from the menu: no prelude; keyboard switches marks; bad question mark is rejected.
        await page.goto(URL); await page.fill('#seed-input','V42-DIRECT'); await page.click('[data-action=guild-start]')
        first=await page.locator('.court-briefing').inner_text()
        assert '王宮' not in first and '借調' in first,first
        level=GUILD[await page.locator('.stage-title').inner_text()]
        await page.keyboard.press('2')
        assert await page.get_attribute('[data-action=mark][data-mark="？"]','aria-checked')=='true'
        end=len(level['raw'])
        await page.click(f'[data-action=select][data-position="{end}"]')
        preview=await page.locator('.punctuation-preview strong').inner_text()
        assert preview==level['raw']+'？',preview
        valid_end=any(c.get('mark')=='？' and c['insertAfter']==end for c in level['choices'])
        await page.click('[data-action=judge]')
        rejected=await page.locator('.judgment-card--invalid').count()==1
        assert rejected!=valid_end,(level['id'],rejected,valid_end)
        await page.keyboard.press('1')  # ignored outside editing
        report['direct']={'stage':level['id'],'endQuestionValid':valid_end,'rejected':rejected}
        # Seven misplaced marks bankrupt the guild.
        await page.goto(URL); await page.fill('#seed-input','V42-BANKRUPT'); await page.click('[data-action=guild-start]')
        for _ in range(7):
            await page.click('[data-action=mark][data-mark="？"]'); await page.click('[data-position="0"]')
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
        boxes=[await b.bounding_box() for b in await mobile.locator('[data-action=mark]').all()]
        assert all(b['height']>=44 for b in boxes),boxes
        level=GUILD[await mobile.locator('.stage-title').inner_text()]
        c=level['choices'][0]
        await mobile.locator(f'[data-action=mark][data-mark="{c.get("mark","，")}"]').tap()
        await mobile.locator(f'[data-action=select][data-position="{c["insertAfter"]}"]').tap()
        stamp=await mobile.locator('[data-action=judge]').bounding_box()
        assert stamp['y']+stamp['height']<=844,stamp
        assert not await mobile.evaluate('document.documentElement.scrollWidth>innerWidth'),'game overflow'
        await mobile.screenshot(path=str(ROOT/'docs/v42-guild-mobile.png'))
        await mobile.locator('[data-action=judge]').tap(); await mobile.locator('[data-action=advance]').tap()
        await play(mobile,GUILD,{},[])
        assert not await mobile.evaluate('document.documentElement.scrollWidth>innerWidth'),'ending overflow'
        report['mobile']={'markButtons':boxes,'stamp':stamp}
        assert not errors,errors
        report['pageErrors']=errors
        await browser.close()
    (ROOT/'docs/v42-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:(v if k!='continue' else {'guildChains':[c for e in v['guild'] for c in e['chains']]}) for k,v in report.items()},ensure_ascii=False,indent=2))
asyncio.run(run())
