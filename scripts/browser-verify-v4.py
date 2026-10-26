import asyncio, json, os, pathlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
HTML=ROOT/'dist/index.html'
DATA=json.loads((ROOT/'content/levels.json').read_text())
NAME={l['title']:l for l in DATA['levels']}
async def run():
 async with async_playwright() as p:
  # Set CHROMIUM_PATH to use a system browser; otherwise Playwright's bundled Chromium is used.
  launch_path={'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
  browser=await p.chromium.launch(**launch_path,headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  page=await browser.new_page(viewport={'width':1366,'height':850},device_scale_factor=1, permissions=['clipboard-read','clipboard-write'])
  await page.evaluate("() => {window.__musicPlayCalls=0;const originalPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__musicPlayCalls++;return originalPlay.call(this)};return true;}")
  errors=[]
  page.on('pageerror',lambda ex:errors.append(str(ex)))
  await page.set_content(HTML.read_text(),wait_until='load')
  assert '本回合委託' not in await page.locator('body').inner_text()
  await page.locator('[data-action=start]').click()
  assert await page.locator('.stage-title').count()==1
  music_status=await page.evaluate('''async ()=>{
   const a=new Audio(BGM_DATA_URI);
   await new Promise((resolve,reject)=>{a.onloadedmetadata=resolve;a.onerror=reject;a.load()});
   return {duration:a.duration,size:BGM_DATA_URI.length};
  }''')
  assert 65<music_status['duration']<69,music_status
  # Track music play request after a real click; inspect browser outcome too.
  # v4.1 loops BGM through Web Audio (gapless); <audio>.play() is only the fallback path.
  await page.wait_for_function("window.__royalMusic && window.__royalMusic().playing", timeout=15000)
  play_requests=await page.evaluate('window.__musicPlayCalls')
  music_state=await page.evaluate('window.__royalMusic()')
  assert music_state['mode'] in ('webaudio','element'),music_state
  stage=await page.locator('.stage-title').inner_text()
  await page.locator('[data-position="0"]').click()
  await page.locator('[data-action=judge]').click()
  assert await page.locator('.judgment-card--invalid').count()==1
  await page.locator('[data-action=advance]').click()
  assert stage==await page.locator('.stage-title').inner_text()
  snapshots=[]
  for i in range(8):
   title=await page.locator('.stage-title').inner_text()
   level=NAME[title]
   # Create a coherent crossover: bear princess saves & marries demon.
   choice=next(c for c in level['choices'] if c['id']=='B') if level['id'] in ('L01','L06') else min(level['choices'],key=lambda v:v['chaosDelta'])
   await page.locator(f'[data-action=select][data-position="{choice["insertAfter"]}"]').click()
   await page.locator('[data-action=judge]').click()
   assert await page.locator('.judgment-card').count()==1
   snapshots.append({'stage':level['id'],'choice':choice['id']})
   await page.locator('[data-action=advance]').click()
  assert '你讓王國勉強活下來' in await page.locator('body').inner_text()
  assert await page.locator('.chronicle-book').count()==1
  story=await page.locator('.chronicle-book').inner_text()
  assert '熊公主即位' in story,story
  assert '肌肉' in story
  assert '國家級災害' not in story  # King's livestream wasn't selected
  await page.screenshot(path=str(ROOT/'docs'/'v4-story-desktop.png'),full_page=True)
  await page.evaluate("window.__copied = ''; document.execCommand = function(cmd) { if(cmd === 'copy') {window.__copied = document.querySelector('textarea:last-of-type')?.value || ''; return true;} return false; }")
  await page.locator('[data-action=copy-chronicle]').click()
  clipboard=await page.evaluate('window.__copied')
  assert '熊公主即位' in clipboard
  async with page.expect_download() as dl:
   await page.locator('[data-action=download-chronicle]').click()
  download=await dl.value
  assert download.suggested_filename.endswith('.txt')
  await page.locator('[data-action=retry]').click()
  for i in range(7):
   await page.locator('[data-position="0"]').click()
   await page.locator('[data-action=judge]').click()
   await page.locator('[data-action=advance]').click()
  assert '你搞丟了一個王國' in await page.locator('body').inner_text()
  defeat=await page.locator('.chronicle-book').inner_text()
  assert '退件' in defeat and '7' in defeat, defeat
  await page.screenshot(path=str(ROOT/'docs'/'v4-defeat-desktop.png'),full_page=True)
  await page.locator('[data-action=retry]').click()
  await page.screenshot(path=str(ROOT/'docs'/'v4-game-desktop.png'),full_page=True)
  mobile=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
  mobile_errors=[]
  mobile.on('pageerror',lambda ex:mobile_errors.append(str(ex)))
  await mobile.set_content(HTML.read_text(),wait_until='load')
  await mobile.locator('[data-action=start]').click()
  await mobile.screenshot(path=str(ROOT/'docs'/'v4-game-mobile.png'),full_page=True)
  overflow=await mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth')
  assert not overflow,'Mobile gameplay horizontal overflow'
  # On mobile, complete eight decrees and inspect a long end story for horizontal overflow.
  for i in range(8):
   title=await mobile.locator('.stage-title').inner_text()
   level=NAME[title]
   choice=min(level['choices'],key=lambda v:v['chaosDelta'])
   await mobile.locator(f'[data-action=select][data-position="{choice["insertAfter"]}"]').click()
   await mobile.locator('[data-action=judge]').click()
   await mobile.locator('[data-action=advance]').click()
  assert await mobile.locator('.chronicle-book').count()==1
  await mobile.screenshot(path=str(ROOT/'docs'/'v4-story-mobile.png'),full_page=True)
  ending_overflow=await mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth')
  assert not ending_overflow,'Mobile ending horizontal overflow' 
  assert not errors and not mobile_errors,(errors,mobile_errors)
  report={'desktopErrors':errors,'mobileErrors':mobile_errors,'bgm':music_status,'musicPlayCalls':play_requests,'musicState':music_state,'gameplay':snapshots,'victory':True,'defeat':True,'bearPrincessCrossover':True,'storyCopy':True,'mobileOverflow':overflow,'mobileEndingOverflow':ending_overflow}
  (ROOT/'docs'/'v4-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
  print(json.dumps(report,ensure_ascii=False,indent=2))
  await browser.close()
asyncio.run(run())
