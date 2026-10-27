import { insertMark, insertMarks, marksOf, isMulti, marksPerDoc, togglePlacement, clearPlacements, validateGameData, newGame, getCurrentLevel, getCurrentChoice,
  selectPosition, selectMark, judgeChoice, advanceGame } from './engine.mjs';
import {makeChronicle} from './epilogue.mjs';
import {ROYAL_WORLD, courtBriefing, latestReactions} from './world.mjs';
import {GUILD_WORLD, makeGuildChronicle} from './guild.mjs';
import {CATHEDRAL_WORLD, makeCathedralChronicle} from './cathedral.mjs';
import {sceneSvg} from './pixelart.mjs';

(() => {
  validateGameData(GAME_DATA);
  validateGameData(GUILD_DATA);
  validateGameData(CATHEDRAL_DATA);
  const root = document.querySelector('#app');
  const STORAGE_KEY = 'royal-comma:v4';
  const pref = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; }
  })();
  let state = null;
  let helpOpen = false;
  let mute = pref.mute === true; // Effects enabled by default after user gesture
  let musicOff = pref.musicOff === true; // Musical loop enabled by default
  let best = Number(pref.best || 0);
  let bestGuild = Number(pref.bestGuild || 0);
  let bestCathedral = Number(pref.bestCathedral || 0);
  let demoPos = null;
  // First-time coaching (once per chapter, per browser).
  let tutorial = {royal: pref.tutorialRoyal === true, guild: pref.tutorialGuild === true, cathedral: pref.tutorialCathedral === true};
  let coachJudgment = false;
  let lastSeed = String(pref.lastSeed || 'ROYAL-001');
  let seedDraft = lastSeed;
  let stageViewKey = '';
  let cut = null; // v4.6: one-shot cutscene shown on the next render (chapter card, stamp slam, finale)
  let audioCtx = null;
  let musicPlayer = null; // <audio> fallback only
  let musicVolume = Number.isFinite(Number(pref.musicVolume)) ? Math.min(1,Math.max(0,Number(pref.musicVolume))) : 0.45;
  const bgm = {buffer:null, loading:null, source:null, gain:null, startedAt:0, offset:0, mode:'idle'};

  const escapeHtml = v => String(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const crown = `<svg class="crown-svg" viewBox="0 0 72 56" fill="none" aria-hidden="true"><path d="M7 18L20 28L36 7L51 28L65 18L58 45H14L7 18Z" fill="#EBC573" stroke="#8D5E27" stroke-width="2.5"/><path d="M14 45H58V52H14Z" fill="#E7B85D" stroke="#8D5E27" stroke-width="2.5"/><circle cx="7" cy="17" r="4" fill="#FFE7A1"/><circle cx="36" cy="7" r="4" fill="#FFE7A1"/><circle cx="65" cy="17" r="4" fill="#FFE7A1"/><path d="M36 31L40 36L36 42L32 36Z" fill="#B3334B"/></svg>`;
  const flourish = '<div class="flourish" aria-hidden="true"><span>✦</span><i></i><span>✧</span><i></i><span>✦</span></div>';

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({best, bestGuild, lastSeed, mute, musicOff, musicVolume, tutorialRoyal: tutorial.royal, tutorialGuild: tutorial.guild, tutorialCathedral: tutorial.cathedral, bestCathedral})); } catch {}
  }
  function randomSeed() {
    if (globalThis.crypto?.getRandomValues) {
      const arr = new Uint32Array(2); crypto.getRandomValues(arr);
      return `ROYAL-${arr[0].toString(36).toUpperCase()}${arr[1].toString(36).toUpperCase()}`;
    }
    return `ROYAL-${Date.now().toString(36).toUpperCase()}`;
  }
  function dailySeed() {
    const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    return `DAILY-${today}`;
  }
  function startGame(seed, chapter='royal', prelude=[]) {
    lastSeed = (String(seed).trim().slice(0,42) || randomSeed());
    seedDraft = lastSeed;
    state = newGame(CHAPTERS[chapter].data, lastSeed, {prelude});
    stopMusic(); bgm.offset = 0;
    helpOpen = false;
    persist();
    sound('start');
    startMusic();
    cut={type:'chapter',chapter,carried:prelude.length>0};
    render(true);
  }
  // All audio is original and generated locally. Music starts only following user interaction.
  function audio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') void audioCtx.resume();
      return audioCtx;
    } catch { return null; }
  }
  function tone(ctx, freq, duration=.16, volume=.025, type='triangle', when=ctx.currentTime, endFreq=null) {
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(Math.max(35,freq),when);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(35,endFreq),when+duration);
    gain.gain.setValueAtTime(.0001,when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(when);osc.stop(when+duration+.02);
  }
  function stampEffect(ctx) {
    const now=ctx.currentTime;
    tone(ctx,130,.24,.13,'sine',now,46);
    tone(ctx,310,.09,.04,'triangle',now,105);
    // Short filtered noise burst imitates heavy wax seal striking parchment.
    const count=Math.ceil(ctx.sampleRate*.12),buffer=ctx.createBuffer(1,count,ctx.sampleRate);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<count;i++) samples[i]=(Math.random()*2-1)*Math.exp(-i/count*12);
    const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=830;
    gain.gain.value=.23;noise.connect(filter).connect(gain).connect(ctx.destination);noise.start(now);
  }
  function sound(kind) {
    if (mute) return;
    const ctx=audio();if(!ctx)return;
    if(kind==='stamp'){stampEffect(ctx);return;}
    if(kind==='confusion'){
      tone(ctx,360,.16,.05,'square',ctx.currentTime,185);
      tone(ctx,165,.19,.04,'sawtooth',ctx.currentTime+.15,85);return;
    }
    if(kind==='win'){
      [392,494,587,784].forEach((f,i)=>tone(ctx,f,.25,.055,'triangle',ctx.currentTime+i*.13));return;
    }
    if(kind==='fail'){
      [330,260,180].forEach((f,i)=>tone(ctx,f,.23,.045,'triangle',ctx.currentTime+i*.16));return;
    }
    tone(ctx,kind==='choose'?550:kind==='judgment'?440:420,.095,.032,'triangle');
  }
  // Original 32-bar weary comic procession (116 BPM, 4/4). v4.1: looped through Web Audio so the
  // bar line repeats without the ~0.2 s MP3 tail/priming gap; <audio loop> stays as a fallback.
  const BGM_BPM = 116, BGM_BARS = 32;
  const BGM_LOOP_SECONDS = BGM_BARS * 4 * 60 / BGM_BPM; // ≈ 66.207 s, bar-exact
  function seamlessLoopBuffer(ctx, decoded) {
    // Start at the first audible sample (decoders differ on MP3 priming), cut at the exact bar
    // length, then mix the ringing tail back into the first beats so the seam is continuous.
    const ch0 = decoded.getChannelData(0);
    let start = 0;
    while (start < ch0.length && Math.abs(ch0[start]) < 1e-3) start++;
    if (start >= ch0.length * .1) start = 0;
    const loopLen = Math.min(Math.round(BGM_LOOP_SECONDS * decoded.sampleRate), decoded.length - start);
    const tailLen = Math.max(0, decoded.length - start - loopLen);
    const out = ctx.createBuffer(decoded.numberOfChannels, loopLen, decoded.sampleRate);
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const src = decoded.getChannelData(c), dst = out.getChannelData(c);
      dst.set(src.subarray(start, start + loopLen));
      for (let i = 0; i < tailLen && i < loopLen; i++) dst[i] += src[start + loopLen + i];
    }
    return out;
  }
  function loadBgmBuffer(ctx) {
    if (bgm.buffer) return Promise.resolve(bgm.buffer);
    if (!bgm.loading) {
      bgm.loading = (async () => {
        const b64 = BGM_DATA_URI.slice(BGM_DATA_URI.indexOf(',') + 1), bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const decoded = await new Promise((resolve, reject) => {
          const p = ctx.decodeAudioData(bytes.buffer, resolve, reject);
          if (p?.then) p.then(resolve, reject);
        });
        bgm.buffer = seamlessLoopBuffer(ctx, decoded);
        return bgm.buffer;
      })().catch(error => { bgm.loading = null; throw error; });
    }
    return bgm.loading;
  }
  function startFallbackMusic() {
    if (!musicPlayer) {
      musicPlayer = new Audio(BGM_DATA_URI);
      musicPlayer.loop = true;
      musicPlayer.preload = 'auto';
    }
    musicPlayer.volume = musicVolume;
    bgm.mode = 'element';
    const promise = musicPlayer.play();
    if (promise?.catch) promise.catch(() => {}); // Browser autoplay may require a gesture.
  }
  function startMusic(){
    if(musicOff || !state || document.hidden)return;
    if(bgm.source || (musicPlayer && !musicPlayer.paused))return;
    const ctx = audio();
    if (!ctx) { startFallbackMusic(); return; }
    bgm.mode = 'loading';
    loadBgmBuffer(ctx).then(buffer => {
      if (musicOff || !state || document.hidden || bgm.source) { if (bgm.mode === 'loading') bgm.mode = 'idle'; return; }
      if (!bgm.gain) { bgm.gain = ctx.createGain(); bgm.gain.connect(ctx.destination); }
      bgm.gain.gain.value = musicVolume;
      const source = ctx.createBufferSource();
      source.buffer = buffer; source.loop = true;
      source.connect(bgm.gain);
      const offset = bgm.offset % buffer.duration;
      source.start(0, offset);
      bgm.source = source; bgm.startedAt = ctx.currentTime - offset; bgm.mode = 'webaudio';
    }).catch(() => startFallbackMusic());
  }
  function stopMusic(){
    if (bgm.source) {
      try { bgm.offset = (audioCtx.currentTime - bgm.startedAt) % bgm.buffer.duration; bgm.source.stop(); } catch {}
      bgm.source.disconnect(); bgm.source = null;
    }
    if (musicPlayer) musicPlayer.pause();
    bgm.mode = 'idle';
  }
  function setMusicVolume(v) {
    musicVolume = Math.min(1, Math.max(0, v));
    if (bgm.gain) bgm.gain.gain.value = musicVolume;
    if (musicPlayer) musicPlayer.volume = musicVolume;
    persist();
  }
  // Read-only hook for automated browser checks (no gameplay information).
  window.__royalMusic = () => ({mode: bgm.mode, playing: Boolean(bgm.source) || Boolean(musicPlayer && !musicPlayer.paused),
    loopSeconds: bgm.buffer?.duration ?? null, volume: musicVolume, contextState: audioCtx?.state ?? null});
  function pill(label, type='neutral') {return `<span class="pill pill--${type}">${label}</span>`;}
  function topbar() {
    const active=state?.phase;
    return `<header class="topbar"><button class="brand" data-action="home" title="返回首頁" aria-label="回到首頁">${crown}<span class="brand__copy"><strong>皇家文書局</strong><small>THE ROYAL SCRIBE</small></span></button><nav class="topbar__actions">${active?`<span class="seed-tag">種子 <b>${escapeHtml(state.seed)}</b></span>`:''}<button data-action="music" class="icon-button" title="${musicOff?'開啟':'關閉'}背景音樂" aria-label="${musicOff?'開啟':'關閉'}背景音樂">${musicOff?'♫̸':'♫'}</button><button data-action="sound" class="icon-button" title="${mute?'開啟':'關閉'}蓋章音效" aria-label="${mute?'開啟':'關閉'}音效">${mute?'🔇':'🔊'}</button><button data-action="help" class="small-button" aria-label="遊戲規則">規則 <span aria-hidden="true">?</span></button></nav></header>`;
  }
  const coin = `<svg class="crown-svg" viewBox="0 0 72 56" fill="none" aria-hidden="true"><ellipse cx="36" cy="30" rx="22" ry="22" fill="#EBC573" stroke="#8D5E27" stroke-width="2.5"/><ellipse cx="36" cy="30" rx="15" ry="15" fill="none" stroke="#B88A3E" stroke-width="2"/><path d="M33 21h6M31 27c0-3 10-3 10 0s-10 3-10 6 10 3 10 0M36 18v24" stroke="#8D5E27" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const keysIcon = `<svg class="crown-svg" viewBox="0 0 72 56" fill="none" aria-hidden="true"><path d="M36 4v10M31 9h10" stroke="#8D5E27" stroke-width="2.6" stroke-linecap="round"/><path d="M18 50V30c0-10 8-16 18-16s18 6 18 16v20Z" fill="#EBC573" stroke="#8D5E27" stroke-width="2.5"/><path d="M30 50V37a6 6 0 0 1 12 0v13" fill="#8a5a9c" stroke="#8D5E27" stroke-width="2"/><circle cx="36" cy="25" r="4" fill="#B3334B"/><path d="M12 50h48" stroke="#8D5E27" stroke-width="2.6" stroke-linecap="round"/></svg>`;
  /* Per-chapter wording. Chapter 1 values are the exact v4.1 strings. */
  const CHAPTERS = {
    royal:{data:GAME_DATA, world:ROYAL_WORLD, chronicle:makeChronicle, insignia:crown, ui:{
      hud:'王國目前狀態', doc:'目前聖旨', risky:'引發大混亂', chaos:'王國混亂', chaosWord:'混亂', score:'荒謬政績',
      tag:n=>`第 ${n} 號敕令`, date:n=>`王國歷 ${n} 日 · 限閱`, kicker:'ROYAL DECREE', caption:'未經標點整理的皇家原文',
      instruction:'所有字與字之間、句首及句尾都能放逗號。<b>有效位置不會事先標示。</b>',
      previewEmpty:'尚未落筆，請點任意字間的「·」。', clear:'移除逗號', footerL:'任意落筆 · 原文不改 · 蓋章即生效', footerR:'皇家第 Ⅷ 號文書令',
      missionP:'國王沒有寫委託。你也沒有上帝視角。', missionCard:'你的逗號，可能讓王國安定，也可能讓王室醜聞衝上頭條。',
      riskSmall:n=>`逗號任意放，但不是每個位置都能形成命令。無效位置使政策停擺、混亂 +${n}，且必須重寫同一關。`,
      stamp:'蓋上皇家印章', stampEmpty:'請先放好逗號', asideTitle:'皇家文書局公告',
      asideP:'<strong>混亂達 7，王國立刻崩潰。</strong>你可以追求高分，也可以選擇保命；但只有順利完成八關才有年終績效獎金。',
      keys:'鍵盤：<kbd>←</kbd> <kbd>→</kbd> 移逗號 · <kbd>Enter</kbd> 蓋章',
      briefing:'宮廷速報 · 前情', chain:'◆ 連鎖反應 · 先前的命令找上門了',
      invalidTitle:'全國官員看不懂聖旨', invalidSummary:'語句無法形成可執行的命令。混亂增加，請在同一關重寫。', safeTitle:'這次王國還算幸運',
      meaning:'公布的正式解讀', invalidMeaning:'公文退件理由', news:'皇家快報', kickerJ:'ROYAL JUDGMENT',
      winNotice:'八份命令全部執行。考績將依國家剩餘程度計算。', loseNotice:'混亂已達到 7 點！朝廷停擺，王國正式崩潰。',
      btnWin:'檢視年度荒謬政績', btnLose:'前往王國結局', btnRetry:'重寫本份聖旨（劇情未前進）', btnNext:n=>`領取下一份聖旨（第 ${n} 關）`,
      endEyebrow:'FINAL ROYAL AUDIT', winH:'你讓王國勉強活下來。', loseH:'你搞丟了一個王國。',
      winP:'八份聖旨全部執行，王國尚未滅亡。下面是依照你的決策寫成的王國正史。', loseP:'王國混亂值到達 7 點。史官把你的每一道命令編成了一部悲喜劇。',
      bonusWin:(b,x)=>`冒險與保守決策 ${b} ＋ 王國存續獎金 ${x}`, bonusLose:(n,i)=>`已執行 ${n} 份聖旨、退件 ${i} 次。王國滅亡不發年終獎金。`,
      newBtn:'換一個王國', bookEyebrow:'YOUR PERSONAL ROYAL HISTORY', bookSmall:'此篇王國史由你實際執行的聖旨與選擇生成', links:'宮廷人物的連鎖報應',
      finaleWin:'尾聲：文書局照常上班', finaleLose:'尾聲：王國雖亡，表格猶在', copyBtn:'複製我的王國故事',
      archiveH:'皇家判決檔案', archiveP:'以下保存你實際簽過的每一份命令，包含退件。', fileStem:'皇家正史', copied:'已複製王國故事'}},
    guild:{data:GUILD_DATA, world:GUILD_WORLD, chronicle:makeGuildChronicle, insignia:coin, ui:{
      hud:'商會目前狀態', doc:'目前合約', risky:'高風險標點', chaos:'信用崩壞', chaosWord:'崩壞', score:'荒謬業績',
      tag:n=>`第 ${n} 號合約`, date:n=>`商會帳期 ${n} · 機密`, kicker:'GUILD CONTRACT', caption:'會長口述、尚未標點的合約原文',
      instruction:'先選<b>逗號或問號</b>，再點字間、句首或句尾放下去。每份合約要放滿<b>兩個</b>符號，兩個都要放對；點已放的符號可以移除或換掉。有效擺法不會事先標示。',
      previewEmpty:'尚未落筆：先選符號，再點任意字間的「·」。', clear:'清除全部符號', footerL:'一份合約 · 兩個符號 · 蓋章即生效', footerR:'金幣商會第 Ⅱ 號章程',
      missionP:'會長沒有交代語氣。你也不知道他是在下令，還是在反問。', missionCard:'一個問號，可能讓合約變成反諷；一個逗號，可能讓會長破產。',
      riskSmall:n=>`兩個符號都要放對，任何一個錯了都不能形成合約。無效擺法使交易停擺、崩壞 +${n}，且必須重寫同一份。`,
      stamp:'蓋上商會公證章', stampEmpty:'請先放兩個符號', asideTitle:'金幣商會公告',
      asideP:'<strong>信用崩壞達 7，商會立刻破產。</strong>六份合約全部蓋章，才有年終分紅。',
      keys:'鍵盤：<kbd>1</kbd> 逗號 · <kbd>2</kbd> 問號 · <kbd>←</kbd> <kbd>→</kbd> 移動 · <kbd>Enter</kbd> 蓋章',
      briefing:'商會快訊 · 前情', chain:'◆ 連鎖反應 · 先前的決定找上門了',
      invalidTitle:'公證處看不懂這份合約', invalidSummary:'這個擺法無法形成可執行的合約。崩壞增加，請重寫同一份。', safeTitle:'這次商會還算幸運',
      meaning:'公證後的正式解讀', invalidMeaning:'公證處退件理由', news:'商會快報', kickerJ:'GUILD JUDGMENT',
      winNotice:'六份合約全部執行。分紅將依剩餘信用計算。', loseNotice:'信用崩壞達到 7 點！股東擠兌，商會正式破產。',
      btnWin:'檢視年度荒謬業績', btnLose:'前往商會結局', btnRetry:'重寫本份合約（劇情未前進）', btnNext:n=>`領取下一份合約（第 ${n} 份）`,
      endEyebrow:'FINAL GUILD AUDIT', winH:'你讓商會勉強撐過一年。', loseH:'你讓商會倒閉了。',
      winP:'六份合約全部執行，商會尚未破產。下面是依照你的標點寫成的商會年報。', loseP:'信用崩壞達到 7 點。帳房把你蓋過的每一份合約編成了一本破產年報。',
      bonusWin:(b,x)=>`冒險與保守標點 ${b} ＋ 商會存續分紅 ${x}`, bonusLose:(n,i)=>`已執行 ${n} 份合約、退件 ${i} 次。商會破產不發分紅。`,
      newBtn:'換一間商會', bookEyebrow:'YOUR GUILD ANNUAL REPORT', bookSmall:'此篇商會年報由你實際蓋章的合約生成', links:'商會人物的連鎖報應',
      finaleWin:'尾聲：公證處照常上班', finaleLose:'尾聲：商會雖倒，帳本猶在', copyBtn:'複製我的商會年報',
      archiveH:'商會公證檔案', archiveP:'以下保存你實際蓋過章的每一份合約，包含退件。', fileStem:'商會年報', copied:'已複製商會年報'}},
  };
  CHAPTERS.cathedral = {data:CATHEDRAL_DATA, world:CATHEDRAL_WORLD, chronicle:makeCathedralChronicle, insignia:keysIcon, ui:{
      hud:'教廷目前狀態', doc:'目前公告', risky:'高風險標點', chaos:'信仰動搖', chaosWord:'動搖', score:'荒謬功德',
      tag:n=>`第 ${n} 號公告`, date:n=>`教廷曆 ${n} 日 · 密封`, kicker:'HOLY SEE NOTICE', caption:'教宗口述、尚未標點的公告原文',
      instruction:'先選<b>逗號、問號或驚嘆號</b>，再點字間、句首或句尾放下去。每份公告要放滿<b>三個</b>符號，三個都要放對；點已放的符號可以移除或換掉。有效擺法不會事先標示。',
      previewEmpty:'尚未落筆：先選符號，再點任意字間的「·」。', clear:'清除全部符號', footerL:'一份公告 · 三個符號 · 蓋章即生效', footerR:'大教廷第 Ⅲ 號諭令',
      missionP:'教宗沒有交代語氣。你不知道他是在宣布、反問，還是在大喊。', missionCard:'一個驚嘆號，可能讓全城衝去救火，也可能讓教宗提前退位。',
      riskSmall:n=>`三個符號都要放對，任何一個錯了都不能成為公告。無效擺法使教務停擺、動搖 +${n}，且必須重寫同一份。`,
      stamp:'蓋上教廷封印', stampEmpty:'請先放三個符號', asideTitle:'大教廷公告欄',
      asideP:'<strong>信仰動搖達 7，教會立刻分裂。</strong>六份公告全部蓋章，才有年終功德。',
      keys:'鍵盤：<kbd>1</kbd> 逗號 · <kbd>2</kbd> 問號 · <kbd>3</kbd> 驚嘆號 · <kbd>←</kbd> <kbd>→</kbd> 移動 · <kbd>Enter</kbd> 蓋章',
      briefing:'教廷快訊 · 前情', chain:'◆ 連鎖反應 · 先前的決定找上門了',
      invalidTitle:'樞機團看不懂這份公告', invalidSummary:'這個擺法無法形成可執行的公告。動搖增加，請重寫同一份。', safeTitle:'這次教廷還算幸運',
      meaning:'教廷認證的正式解讀', invalidMeaning:'樞機團退件理由', news:'教廷快報', kickerJ:'HOLY SEE JUDGMENT',
      winNotice:'六份公告全部發布。功德將依剩餘信仰計算。', loseNotice:'信仰動搖達到 7 點！樞機團決裂，教會正式分裂。',
      btnWin:'檢視年度荒謬功德', btnLose:'前往教廷結局', btnRetry:'重寫本份公告（劇情未前進）', btnNext:n=>`領取下一份公告（第 ${n} 份）`,
      endEyebrow:'FINAL HOLY AUDIT', winH:'你讓教廷撐過了一年。', loseH:'你讓教會分裂了。',
      winP:'六份公告全部發布，教會尚未分裂。下面是依照你的標點寫成的教廷年鑑。', loseP:'信仰動搖達到 7 點。史官把你發布的每一份公告編成了一部分裂史。',
      bonusWin:(b,x)=>`冒險與保守標點 ${b} ＋ 教會存續功德 ${x}`, bonusLose:(n,i)=>`已發布 ${n} 份公告、退件 ${i} 次。教會分裂不計功德。`,
      newBtn:'換一座教廷', bookEyebrow:'YOUR HOLY SEE ANNALS', bookSmall:'此篇教廷年鑑由你實際蓋章的公告生成', links:'教廷人物的連鎖報應',
      finaleWin:'尾聲：告解室照常開放', finaleLose:'尾聲：教會雖裂，公告猶在', copyBtn:'複製我的教廷年鑑',
      archiveH:'教廷封印檔案', archiveP:'以下保存你實際蓋過封印的每一份公告，包含退件。', fileStem:'教廷年鑑', copied:'已複製教廷年鑑'}};
  const CH = () => CHAPTERS[state?.chapter ?? 'royal'];
  const DATA = () => CH().data;
  const U = () => CH().ui;
  const MARK_NAMES = {'，':'逗號','？':'問號','！':'驚嘆號'};
  /* Menu: teach the one mechanic on the first screen with a sentence that is NOT in the game. */
  const DEMO={raw:'貓不抓老鼠抓狗',readings:{3:'貓不出手，結果老鼠跑去抓狗。',5:'貓放過老鼠，改去抓狗。'}};
  function demoCard() {
    const chars=Array.from(DEMO.raw),pos=demoPos;
    const slot=i=>`<button type="button" class="demo-slot ${pos===i?'demo-slot--on':''}" data-action="demo" data-demo="${i}" aria-label="示範：在第 ${i} 字後放逗號" aria-pressed="${pos===i}">${pos===i?'，':'·'}</button>`;
    const text=pos===null?DEMO.raw:insertMark(DEMO.raw,pos,'，');
    const meaning=pos===null?'點一下字與字之間的「·」試試看。'
      :DEMO.readings[pos]?`✔ 讀得通：${DEMO.readings[pos]}`:'✘ 這樣放，句子還是有兩種讀法，沒人知道該照哪個做——在遊戲裡會被退件，混亂 +1。';
    return `<section class="howto" aria-label="怎麼玩"><div class="howto__demo"><span class="howto__label">試玩一句（不在正式關卡裡）</span><div class="demo-sentence">${slot(0)}${chars.map((ch,i)=>`<span class="demo-glyph">${ch}</span>${slot(i+1)}`).join('')}</div><p class="demo-result ${pos===null?'':DEMO.readings[pos]?'demo-result--ok':'demo-result--bad'}" aria-live="polite"><b>${escapeHtml(text)}</b><span>${meaning}</span></p></div><ol class="howto__steps"><li><b>放一個逗號</b>每份聖旨都少一個逗號，點字與字之間的「·」放下去。只有兩個位置讀得通。</li><li><b>蓋章送出</b>按下「蓋章送出」，命令就照你的標點執行，不能反悔。</li><li><b>越亂越高分</b>兩種讀法裡，更混亂的 +180 分、較安穩的 +65 分；混亂到 7，王國就倒了。</li></ol></section>`;
  }
  function menu() {
    return `<main class="menu-page"><div class="menu-hero menu-hero--compact"><div class="eyebrow"><span class="diamond">◆</span> 第一章 · 國王的遺囑只有一個逗號 <span class="diamond">◆</span></div>
      <h1>這個標點符號<br/><em>誰放的？</em></h1>
      <p class="menu-subtitle">同一句話，逗號放的位置不同，意思就完全不同。你負責放逗號，王國負責承擔後果。</p>
      ${demoCard()}
      <div class="menu-cta"><button class="btn btn--primary btn--huge" data-action="start">開始遊戲：第一章 <span>›</span></button><div class="menu-cta__seed"><label for="seed-input">王國代碼（選填，同代碼同關卡順序）</label><div class="seed-input-row"><input id="seed-input" class="seed-input" type="text" maxlength="42" value="${escapeHtml(seedDraft)}" autocomplete="off" spellcheck="false" aria-label="王國種子代碼"/><button class="btn btn--ghost btn--square" data-action="random-seed" title="產生新代碼" aria-label="產生隨機種子">↻</button></div></div></div>
    </div>
    <div class="menu-options"><div class="menu-options__main"><div class="section-eyebrow">THE STORY</div><h2>今日，就職。</h2><p class="story-lede story-lede--card">國王身體健康，卻預立了八份沒有標點的遺囑。依宮廷規定，遺囑必須「生前試行」，以免死後出錯。你是皇家文書局的書記官，負責替每一份遺囑補上一個逗號——沒有人告訴你哪種解讀才算正確。</p><div class="menu-quick"><button data-action="daily" class="text-button">◈ 今日王國挑戰</button><button data-action="help" class="text-button">完整規則</button></div>
      <div class="chapter-entry"><span class="chapter-entry__tag">第二章 · 會長的合約少了兩個符號</span><p>書記官被借調到金幣商會。這一章每份合約要放<b>兩個</b>符號（逗號或問號），兩個都要放對。通關第一章後可帶著前情接續；也可以直接開始。</p><button class="btn btn--ghost" data-action="guild-start">直接開始第二章（無前情）›</button>${bestGuild?`<small>本機第二章最高業績 ${bestGuild.toLocaleString('zh-TW')} 分</small>`:''}</div>
      <div class="chapter-entry"><span class="chapter-entry__tag">第三章 · 教宗的公告少了三個語氣</span><p>書記官被借調到大教廷。這一章每份公告要放<b>三個</b>符號（逗號、問號或驚嘆號），三個都要放對。通關第二章後可帶著前兩章的前情接續；也可以直接開始。</p><button class="btn btn--ghost" data-action="cathedral-start">直接開始第三章（無前情）›</button>${bestCathedral?`<small>本機第三章最高功德 ${bestCathedral.toLocaleString('zh-TW')} 分</small>`:''}</div></div>
    <aside class="menu-options__aside"><div class="rule-label">皇家文書局招聘須知</div><div class="rule-item"><span class="rule-icon">，</span><div><strong>一關一個逗號</strong><p>不可更動聖旨上的任何字。</p></div></div><div class="rule-item"><span class="rule-icon">♜</span><div><strong>沒有委託，也沒有答案</strong><p>從語意猜哪種命令會更混亂，只有能執行的解讀才推進劇情。</p></div></div><div class="rule-item"><span class="rule-icon">⚖</span><div><strong>引發混亂才能刷高分</strong><p>較危險的解讀 +180 分；較安穩的 +65 分。錯誤標點混亂 +1 並退件。</p></div></div><div class="warning-strip"><strong>⚠ 國王生前最後的提醒</strong><p>王國混亂達 <b>7</b>，王國就會崩潰並立即結束遊戲。逗號放錯位置也會增加混亂；想得高分，得先讓王國活到第八關！</p></div><div class="personal-best">${best ? `<span>本機最高政績</span><b>${best.toLocaleString('zh-TW')} 分</b>` : '<span>本機尚無通關紀錄</span><b>等待第一位書記官</b>'}</div></aside></div></main>`;
  }
  function metric(label, value, sub, cls='') {return `<div class="metric ${cls}"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`;}
  function getRiskText(delta) {const w=U().chaosWord;return delta > 0 ? `${w} +${delta}` : delta < 0 ? `${w} ${delta}` : `${w}不變`;}
  function statusHud() {
    const max=state.settings.chaosLoseAt,u=U(),rounds=state.settings.rounds;
    return `<section class="status-strip" aria-label="${u.hud}"><div class="stat"><span class="stat__label">${u.doc}</span><strong class="stat__value">${String(Math.min(state.round+1,rounds)).padStart(2,'0')} <small>/ ${String(rounds).padStart(2,'0')}</small></strong></div><div class="stat stat--seals"><span class="stat__label">${u.risky}</span><strong class="stat__value">${state.riskyCount} <small>次</small></strong></div><div class="stat stat--chaos"><span class="stat__label">${u.chaos}</span><strong class="stat__value stat__value--chaos ${state.chaos>=5?'danger':''}">${state.chaos} <small>/ ${max}</small></strong><div class="chaos-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${state.chaos}"><div style="width:${Math.max(0,Math.min(100,state.chaos/max*100))}%"></div></div></div><div class="stat"><span class="stat__label">${u.score}</span><strong class="stat__value">${state.score.toLocaleString('zh-TW')}</strong></div></section>`;
  }
  function multiMark() {return marksOf(DATA()).length>1;}
  function markPicker() {
    if(!multiMark())return '';
    return `<div class="mark-picker" role="radiogroup" aria-label="選擇標點符號">${marksOf(DATA()).map(m=>{const on=state.selectedMark===m;return `<button type="button" class="mark-option ${on?'mark-option--on':''}" role="radio" aria-checked="${on}" data-action="mark" data-mark="${m}"><b>${m}</b><small>${MARK_NAMES[m]}</small></button>`;}).join('')}</div>`;
  }
  function sentenceSlots(level) {
    const chars=Array.from(level.raw),selected=state.selectedPosition,mark=state.selectedMark??'，',name=multiMark()?'符號':'逗號';
    const multi=isMulti(DATA()),placed=new Map((state.placements??[]).map(p=>[p.position,p.mark]));
    const shown=i=>multi?placed.get(i)??null:selected===i?mark:null;
    const slot=(i)=>{const m=shown(i);return `<button type="button" class="comma-slot ${m?'comma-slot--chosen':''}" data-action="select" data-position="${i}" aria-label="${m?`第 ${i} 字後已放「${m}」，點一下${multi&&m===mark?'移除':'改放'}`:`在第 ${i} 字後放${multiMark()?MARK_NAMES[mark]:'逗號'}`}" aria-pressed="${Boolean(m)}" title="把${name}放在這裡">${m??'·'}</button>`;};
    const empty=multi?placed.size===0:state.selectedPosition===null;
    return `<div class="sentence ${coaching()&&empty?'sentence--coach':''}" role="group" aria-label="任意選擇${name}位置">${slot(0)}${chars.map((ch,i)=>`<span class="glyph-pair"><span class="glyph">${escapeHtml(ch)}</span>${slot(i+1)}</span>`).join('')}</div>`;
  }
  function briefingCard(level) {
    const lines=courtBriefing(state.history,level.id,CH().world,state.prelude);
    if(!lines.length)return '';
    return `<aside class="court-briefing" aria-label="${U().briefing}"><span class="court-briefing__label">${U().briefing}</span>${lines.map(t=>`<p>${escapeHtml(t)}</p>`).join('')}</aside>`;
  }
  function chainBlock(entry) {
    if(!entry.valid)return '';
    const chains=latestReactions(state.history,CH().world,state.prelude);
    if(!chains.length)return '';
    return `<section class="chain-reaction" aria-label="連鎖反應"><span class="chain-reaction__label">${U().chain}</span>${chains.map(c=>`<div class="chain-reaction__item"><h4>${escapeHtml(c.title)}</h4><p>${escapeHtml(c.judgment)}</p></div>`).join('')}</section>`;
  }
  /* The one "submit" action: big, high-contrast, placed right under the player's sentence. */
  function stampButton(preview,ready,missing) {
    const u=U();
    return `<button type="button" class="stamp-cta ${ready?'stamp-cta--ready':''}" data-action="judge" ${ready?'':'disabled'} aria-describedby="stamp-hint"><span class="stamp-cta__seal" aria-hidden="true">印</span><span class="stamp-cta__text"><small class="stamp-cta__kicker">${ready?'最後一步・確定送出':'還不能送出'}</small><strong class="stamp-cta__main">${ready?'蓋章送出':missing>0&&isMulti(DATA())&&missing<marksPerDoc(DATA())?`還差 ${missing} 個符號`:u.stampEmpty}</strong><small class="stamp-cta__sub" id="stamp-hint">${ready?`${u.stamp}，執行「${escapeHtml(preview)}」・不可反悔`:isMulti(DATA())?`這份要放滿 ${marksPerDoc(DATA())} 個符號，按鈕才會亮起`:'先在上方原文點一個位置，按鈕就會亮起'}</small></span>${ready?'<kbd class="stamp-cta__key" aria-hidden="true">Enter</kbd>':''}</button>`;
  }
  function coaching() {return state&&!tutorial[state.chapter]&&state.round===0&&state.history.length===0;}
  function coachBubble() {
    if(!coaching())return '';
    const multi=isMulti(DATA()),guild=state.chapter==='guild';
    const placed=multi?(state.placements??[]).length===marksPerDoc(DATA()):state.selectedPosition!==null;
    const text=!placed
      ? (state.chapter==='cathedral'?`<b>第一步</b>先選「逗號」「問號」或「驚嘆號」，再點字間的「·」放下去。這份公告要放滿 <b>${marksPerDoc(DATA())}</b> 個符號；點已放的符號可以移除或換掉。`:guild?`<b>第一步</b>先選「逗號」或「問號」，再點字間的「·」放下去。這份合約要放滿 <b>${marksPerDoc(DATA())}</b> 個符號；點已放的符號可以移除或換掉。`:'<b>第一步</b>點字與字之間的任一個「·」，把逗號放下去。')
      : '<b>第二步</b>按下「蓋章送出」——按鈕上會寫出你要送出的句子。不滿意可以先點別的位置。';
    return `<div class="coach ${placed?'coach--down':''}" role="note"><span class="coach__badge">第一次玩</span><p>${text}</p></div>`;
  }
  function gameplay() {
    const level=getCurrentLevel(state,DATA()),u=U(),n=state.round+1;
    const position=state.selectedPosition;
    const multi=isMulti(DATA()),need=marksPerDoc(DATA()),count=(state.placements??[]).length;
    const preview=multi?(count?insertMarks(level.raw,state.placements):u.previewEmpty):position===null?u.previewEmpty:insertMark(level.raw,position,state.selectedMark??'，');
    const ready=multi?count===need:position!==null;
    const nav=multi
      ?`<div class="comma-nav"><span class="mark-count ${ready?'mark-count--full':''}" aria-live="polite">已放 <b>${count}</b> / ${need} 個符號</span><button type="button" data-action="clear" ${count===0?'disabled':''}>${u.clear}</button></div>`
      :`<div class="comma-nav"><button type="button" data-action="shift" data-offset="-1" ${position===null||position===0?'disabled':''}>◀ 向左移一格</button><button type="button" data-action="clear" ${position===null?'disabled':''}>${u.clear}</button><button type="button" data-action="shift" data-offset="1" ${position===null||position===Array.from(level.raw).length?'disabled':''}>向右移一格 ▶</button></div>`;
    return `<main class="game-page chapter-${state.chapter}">${statusHud()}<div class="game-layout"><section class="parchment"><div class="parchment__top"><span class="scroll-tag">${u.tag(n)}</span><span>${u.date(n)}</span></div><div class="royal-insignia">${CH().insignia}</div><p class="scroll-kicker">${u.kicker} · ${String(n).padStart(2,'0')}</p><h2 class="stage-title">${escapeHtml(level.title)}</h2><p class="stage-context">${escapeHtml(level.context)}</p>${briefingCard(level)}<div class="decree-box"><div class="decree-caption">${u.caption}</div>${coachBubble()}${markPicker()}${sentenceSlots(level)}<div class="decree-instruction">${u.instruction}</div><div class="punctuation-preview" aria-live="polite"><span>你的標點版本</span><strong>${escapeHtml(preview)}</strong></div>${nav}${stampButton(preview,ready,need-count)}</div><div class="scroll-footer"><span>${u.footerL}</span><span>${u.footerR}</span></div></section><aside class="mission-panel"><div class="mission-head"><span class="section-eyebrow">READ THE CONSEQUENCES</span><h3>猜猜看，哪種解讀更糟？</h3><p>${u.missionP}</p></div><div class="mission-card"><div class="mission-card__badge">盲判混亂 · 沒有標準答案提示</div><p>${u.missionCard}</p><small>在兩種可執行解讀中，選到<b>較混亂的結果 +180 分</b>，選到<b>較安穩的結果 +65 分</b>。風險與劇情都在蓋章後才揭曉。</small></div><div class="risk-card"><span>唯一確定的行政風險</span><strong>${u.chaosWord} ${state.chaos} / ${state.settings.chaosLoseAt}</strong><small>${u.riskSmall(state.settings.invalidChaosPenalty)}</small></div><div class="aside-note"><b>${u.asideTitle}</b><p>${u.asideP}</p></div><div class="keyboard-help">${u.keys}</div></aside></div></main>`;
  }
  function sceneArt(entry) {
    const svg=sceneSvg(entry.stageId,entry.choiceId,entry.headline);
    return svg?`<figure class="scene-art">${svg}</figure>`:'';
  }
  function judgment() {
    const entry=state.history.at(-1),terminal=state.endingReason,invalid=!entry.valid,u=U();
    const stampText=invalid?'退件':entry.riskier?'大亂':'核行';
    const title=invalid?u.invalidTitle:entry.riskier?'你選中了更混亂的解讀！':u.safeTitle;
    const summary=invalid?u.invalidSummary:entry.riskier?'你在兩種合法解讀中，挑了危險係數較高的一種。':'你採取了兩種合法解讀中相對安穩的一種。';
    const retryStage=invalid&&!terminal;
    return `<main class="judgment-page">${statusHud()}<div class="judgment-card ${invalid?'judgment-card--invalid':''}"><div class="stamp-graphic ${!invalid&&entry.riskier?'stamp-graphic--bad':'stamp-graphic--good'}" aria-hidden="true"><div class="stamp-inner">${stampText}</div></div><p class="scroll-kicker">${u.kickerJ} · ${entry.stageId}</p><h2>${title}</h2><p class="judgment-sub">${summary}</p>${coachJudgment?`<div class="coach coach--judgment" role="note"><span class="coach__badge">第一次玩</span><p>這就是你的命令造成的後果。看完之後，按最下方的按鈕繼續${invalid?'重寫這一份':'下一份'}。</p></div>`:''}<div class="judgment-quote">${escapeHtml(entry.punctuated)}</div><div class="meaning-box"><div class="field-label">${invalid?u.invalidMeaning:u.meaning}</div><strong>${escapeHtml(entry.meaning)}</strong></div><div class="story-banner">${invalid?'':sceneArt(entry)}<span>${u.news}</span><h3>${escapeHtml(entry.headline)}</h3><p>${escapeHtml(entry.scene)}</p><p class="story-after">${escapeHtml(entry.afterword)}</p></div>${chainBlock(entry)}<div class="judgment-metrics">${metric(u.score,`+${entry.scoreEarned} 分`,invalid?'文件退件、不得分':entry.riskier?'高風險解讀獎勵':'穩健解讀基本分',entry.riskier?'bad':'good')}${metric(u.chaos,`${entry.chaosBefore} → ${entry.chaosAfter}`,getRiskText(entry.chaosDelta),entry.chaosDelta>0?'bad':'good')}${metric('本局考驗',invalid?'標點失誤':entry.riskier?'更混亂的解讀':'較安穩的解讀',invalid?'本關不會前進':'比較的是此關的兩種合法解讀')}</div>${terminal?`<div class="terminal-notice ${terminal==='victory'?'terminal-notice--good':''}">${terminal==='victory'?u.winNotice:u.loseNotice}</div>`:''}<button class="btn btn--primary btn--wide" data-action="advance">${terminal==='victory'?u.btnWin:terminal?u.btnLose:retryStage?u.btnRetry:u.btnNext(state.round+2)} <span>›</span></button></div></main>`;
  }
  function chronicleText(story) {
    return [story.title,story.opening,...story.acts.flatMap(a=>[a.title,a.text]),...story.connections.flatMap(c=>[c.title,c.text]),'尾聲',story.epilogue].join('\n\n');
  }
  function ending() {
    const won=state.phase==='victory',u=U(),chapter=state.chapter,guild=chapter!=='royal';
    if(won&&chapter==='royal'&&state.score>best){best=state.score;persist();}
    if(won&&chapter==='guild'&&state.score>bestGuild){bestGuild=state.score;persist();}
    if(won&&chapter==='cathedral'&&state.score>bestCathedral){bestCathedral=state.score;persist();}
    const chronicle=CH().chronicle(state);
    const history=state.history.map((e,i)=>`<li class="history-item"><span class="history-index">${String(i+1).padStart(2,'0')}</span><div><strong>${escapeHtml(e.stageTitle)}</strong><p>${escapeHtml(e.punctuated)}</p><small>${escapeHtml(e.consequence)}</small></div><div class="history-result">${!e.valid?pill('退件','bad'):e.riskier?pill('大亂','bad'):pill('求穩','good')}<small>${getRiskText(e.chaosDelta)}</small></div></li>`).join('');
    const base=state.score-state.finalBonus;
    const acts=chronicle.acts.map(a=>`<section class="chronicle-act"><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.text)}</p></section>`).join('');
    const bridges=chronicle.connections.map(c=>`<section class="chronicle-crossover"><span class="chronicle-crossover__label">◆　跨關劇情觸發</span><h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.text)}</p></section>`).join('');
    const nextChapter=!won?'':chapter==='royal'?`<div class="chapter-next"><span class="chapter-entry__tag">第二章 · 會長的合約少了兩個符號</span><p>你在王宮做過的決定，會跟著你一起進入金幣商會。這一章每份合約要放兩個符號。</p><button class="btn btn--primary" data-action="guild-continue">帶著這一局前往第二章 ›</button></div>`
      :chapter==='guild'?`<div class="chapter-next"><span class="chapter-entry__tag">第三章 · 教宗的公告少了三個語氣</span><p>你在${state.prelude.length?'王宮與商會':'商會'}做過的決定，會跟著你一起走進大教廷。這一章每份公告要放三個符號。</p><button class="btn btn--primary" data-action="cathedral-continue">帶著這一局前往第三章 ›</button></div>`:'';
    return `<main class="ending-page"><section class="ending-hero ${won?'ending-hero--win':'ending-hero--lose'}"><div class="hero-crown">${CH().insignia}</div><div class="eyebrow">${u.endEyebrow}</div><h1>${won?u.winH:u.loseH}</h1><p>${won?u.winP:u.loseP}</p><div class="final-score"><span>${u.score}</span><strong>${state.score.toLocaleString('zh-TW')}</strong><small>分</small></div>${won?`<div class="bonus-breakdown">${u.bonusWin(base,state.finalBonus)}</div>`:`<div class="bonus-breakdown">${u.bonusLose(state.history.filter(e=>e.valid).length,state.invalidAttempts)}</div>`}<div class="end-badges">${pill(`大混亂 ${state.riskyCount} 次`)}${pill(`安穩解讀 ${state.cautiousCount} 次`,'good')}${pill(`${u.chaosWord} ${state.chaos}/7`,state.chaos>=7?'bad':'neutral')}${pill(`退件 ${state.invalidAttempts} 次`)}</div>${nextChapter}<div class="end-actions"><button class="btn btn--primary" data-action="retry">同一局再挑戰</button><button class="btn btn--ghost" data-action="new">${u.newBtn}</button>${guild?'<button class="btn btn--ghost" data-action="home">回到主選單</button>':''}</div><div class="seed-footer">本局代碼：${escapeHtml(state.seed)}　<button class="inline-link" data-action="copy-seed">複製代碼</button></div></section><article class="chronicle-book"><div class="section-eyebrow">${u.bookEyebrow}</div><div class="chronicle-heading"><span class="chronicle-seal">✒</span><div><h2>${escapeHtml(chronicle.title)}</h2><small>${u.bookSmall}</small></div></div><p class="chronicle-intro">${escapeHtml(chronicle.opening)}</p>${acts}${bridges?`<div class="chronicle-links"><h3>${u.links}</h3>${bridges}</div>`:''}<div class="chronicle-finale"><strong>${won?u.finaleWin:u.finaleLose}</strong><p>${escapeHtml(chronicle.epilogue)}</p></div><div class="chronicle-actions"><button class="btn btn--ghost" data-action="copy-chronicle">${u.copyBtn}</button><button class="btn btn--ghost" data-action="download-chronicle">下載故事 TXT</button><span>每一條命令都會改寫這部正史</span></div></article><section class="history-card"><div class="section-eyebrow">THE ARCHIVES</div><h2>${u.archiveH}</h2><p>${u.archiveP}</p><details class="history-details"><summary>展開逐關紀錄（${state.history.length} 筆）</summary><ol class="history-list">${history}</ol></details></section></main>`;
  }
  function help() {
    if(!helpOpen)return '';
    return `<div class="modal-backdrop" data-action="close-help" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button class="modal-close" aria-label="關閉遊戲規則" data-action="close-help">×</button><span class="section-eyebrow">EMPLOYEE HANDBOOK</span><h2 id="help-title">皇家文書局員工守則 v4.4</h2><ol><li>八份聖旨都少了一個逗號。可以把全形逗號放在<b>任何兩字之間、句首或句尾</b>，不會標示正確位置。</li><li><b>沒有本回合委託。</b>你的挑戰是從兩種可能的解讀，推測哪一種會讓王國更混亂，獲得更多荒謬政績分數。</li><li>每份聖旨只有兩個事先撰寫的可執行解讀；其他位置一律造成<b>施政癱瘓</b>：混亂 +1、退件重寫、本關不前進，也不能得分。</li><li>合法解讀中<b>相對較混亂者 +180 分</b>，相對較安穩者<b> +65 分</b>。你只會在蓋章後看到結果與爆笑宮廷快報。</li><li>真正的混亂變化依劇情決定，可能上升、保持或下降；高分不代表安全。<b>混亂達到 7 點，王國立刻崩潰。</b></li><li>王國會記得你做過的事：先前執行的命令會出現在下一份聖旨的<b>宮廷速報</b>，也可能在蓋章後引發<b>連鎖反應</b>。速報只報導已發生的事，不會透露逗號位置。</li><li>順利完成八份聖旨就勝利，依剩餘王國穩定度加發年終獎金。相同的王國種子有相同關卡順序。</li><li><b>第三章（大教廷）：</b>六份公告，每份要放滿<b>三個</b>符號（逗號、問號或驚嘆號可混用），全部放對才能執行；可執行的解讀只有兩種。信仰動搖達 7 教會分裂。從第二章通關接續時，前兩章的決定都會影響教廷劇情。</li><li><b>第二章（金幣商會）：</b>六份合約，每份要放滿<b>兩個</b>符號（逗號或問號可混用），全部放對才能執行；可執行的解讀一樣只有兩種，其他擺法退件、崩壞 +1。信用崩壞達 7 商會破產。從第一章通關接續時，你在王宮的決定會影響商會劇情。</li><li>背景音樂是約 66 秒、32 小節的原創滑稽宮廷小曲，採用笛聲、彈撥和笨重低音；不是參考歌曲的旋律重現；音樂和蓋章音效可分別開關。</li></ol><div class="sound-settings"><label for="music-volume">背景音樂音量 <output id="music-volume-value">${Math.round(musicVolume*100)}%</output></label><input id="music-volume" type="range" min="0" max="100" step="5" value="${Math.round(musicVolume*100)}" aria-label="背景音樂音量"/><small>音樂與蓋章音效也可以用右上角按鈕分別開關。</small></div><div class="help-keys"><kbd>←</kbd> / <kbd>→</kbd> 移動逗號　<kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> 切換逗號／問號／驚嘆號　<kbd>Enter</kbd> 提交／下一關　<kbd>Esc</kbd> 說明</div><button class="btn btn--primary btn--wide" data-action="close-help">知道了，讓國家安全地混亂</button></section></div>`;
  }
  function focusDescriptor() {
    const el=document.activeElement;
    if(!el||el===document.body||!root.contains(el))return null;
    if(el.dataset?.action)return {action:el.dataset.action,position:el.dataset.position??null,mark:el.dataset.mark??null};
    return el.id?{id:el.id}:null;
  }
  function restoreFocus(d) {
    if(!d)return;
    const target=d.id?document.getElementById(d.id)
      :root.querySelector(d.position!==null?`[data-action="${d.action}"][data-position="${d.position}"]`:d.mark!==null?`[data-action="${d.action}"][data-mark="${d.mark}"]`:`[data-action="${d.action}"]`);
    const chosen=d.action==='select'&&state?.phase==='editing'&&state.selectedPosition!==null
      ?root.querySelector(`[data-action="select"][data-position="${state.selectedPosition}"]`):null;
    const el=chosen||target;
    if(el&&!el.disabled)el.focus({preventScroll:true});
  }
  // v4.6 cutscenes: pure CSS, never cover the answer before stamping, never wait for input.
  const CUT_TITLES = {royal:['第一章','國王的遺囑只有一個逗號','每份聖旨放 1 個逗號'], guild:['第二章','會長的合約少了兩個符號','每份合約放 2 個符號：，？'], cathedral:['第三章','教宗的公告少了三個語氣','每份公告放 3 個符號：，？！']};
  function cutscene() {
    if (!cut) return '';
    if (cut.type==='chapter') {
      const [no,title,rule]=CUT_TITLES[cut.chapter];
      return `<div class="cutscene cutscene--chapter chapter-${cut.chapter}" data-action="skip-cut" aria-hidden="true"><div class="cut-card"><div class="cut-insignia">${CHAPTERS[cut.chapter].insignia}</div><div class="cut-no">${no}${cut.carried?' · 前情延續':''}</div><div class="cut-title">${title}</div><div class="cut-rule">${rule}</div><div class="cut-marks"><span>，</span><span>？</span><span>！</span></div></div></div>`;
    }
    if (cut.type==='stamp') return `<div class="cutscene cutscene--stamp ${cut.valid?'':'cutscene--void'}" aria-hidden="true"><div class="cut-stamp"><span>${cut.valid?'准':'退'}</span></div></div>`;
    const marks=['，','？','！'];
    const bits=Array.from({length:28},(_,i)=>`<i style="--x:${(i*37)%100}%;--d:${((i*53)%17)/10}s;--t:${2.2+((i*29)%13)/10}s;--r:${(i*71)%360}deg">${marks[i%3]}</i>`).join('');
    return `<div class="cutscene cutscene--finale ${cut.won?'':'cutscene--lose'}" aria-hidden="true">${bits}</div>`;
  }
  function render(resetScroll=false) {
    const focus = resetScroll ? null : focusDescriptor();
    const key = state ? `${state.phase}-${state.round}` : 'menu';
    root.innerHTML = `${topbar()}${state ? state.phase==='editing'?gameplay():state.phase==='judgment'?judgment():ending():menu()}<footer class="site-footer">© 皇家文書局　·　所有人物與政變均屬虛構　·　原創網頁遊戲 v4.8</footer>${help()}<div class="toast" role="status" aria-live="polite" id="toast"></div>${cutscene()}`;
    if (key !== stageViewKey) root.querySelector('main')?.classList.add(...(cut?.type==='stamp'?['scene-in','scene-in--stamp']:['scene-in']));
    cut = null;
    if (resetScroll || key !== stageViewKey) window.scrollTo({top:0,behavior:'instant'});
    stageViewKey = key;
    restoreFocus(focus);
  }
  function stampNow() {
    const wasCoaching=coaching();
    state=judgeChoice(state,DATA());
    if(wasCoaching){tutorial[state.chapter]=true;coachJudgment=true;persist();}
    sound('stamp');if(!state.history.at(-1).valid)sound('confusion');cut={type:'stamp',valid:state.history.at(-1).valid};render(true);
    coachJudgment=false;
  }
  let toastTimeout;
  function toast(message) {
    const node=document.getElementById('toast');
    if(!node) return;
    node.textContent=message;node.classList.add('toast--show');
    clearTimeout(toastTimeout);
    toastTimeout=setTimeout(()=>node.classList.remove('toast--show'),2600);
  }
  root.addEventListener('input',event=> {
    if (event.target?.id==='seed-input') seedDraft=event.target.value;
    if (event.target?.id==='music-volume') {
      setMusicVolume(Number(event.target.value)/100);
      const out=document.getElementById('music-volume-value'); if(out) out.textContent=`${event.target.value}%`;
    }
  });
  root.addEventListener('animationend',event=>{if(event.target.classList?.contains('cutscene'))event.target.remove();});
  root.addEventListener('click',event=> {
    const target=event.target.closest('[data-action]');
    if (!target) return;
    const action=target.dataset.action;
    if(action==='skip-cut'){target.remove();return;}
    if(action==='help'){helpOpen=true;render();setTimeout(()=>root.querySelector('.modal-close')?.focus(),0);return;}
    if(action==='close-help'){
      if(target.classList.contains('modal-backdrop') && event.target !== target) return;
      helpOpen=false;render();return;
    }
    if(action==='sound'){mute=!mute;persist();sound('start');render();return;}
    if(action==='music'){musicOff=!musicOff;persist();if(musicOff)stopMusic();else startMusic();render();return;}
    if(action==='home'){
      if(state && !['victory','defeat'].includes(state.phase) && !confirm('返回首頁會放棄這一局，確定要離開嗎？')) return;
      state=null;helpOpen=false;stopMusic();render(true);return;
    }
    if(action==='random-seed'){seedDraft=randomSeed();root.querySelector('#seed-input').value=seedDraft;toast('已產生新王國代碼');return;}
    if(action==='start'){startGame(root.querySelector('#seed-input')?.value||seedDraft);return;}
    if(action==='daily'){startGame(dailySeed());return;}
    if(action==='new'){startGame(randomSeed(),state?.chapter??'royal',state?.prelude??[]);return;}
    if(action==='retry'){startGame(state.seed,state.chapter,state.prelude);return;}
    if(action==='guild-start'){startGame(root.querySelector('#seed-input')?.value||seedDraft,'guild',[]);return;}
    if(action==='guild-continue'&&state?.chapter==='royal'&&state.phase==='victory'){startGame(state.seed,'guild',state.history);return;}
    if(action==='cathedral-start'){startGame(root.querySelector('#seed-input')?.value||seedDraft,'cathedral',[]);return;}
    if(action==='cathedral-continue'&&state?.chapter==='guild'&&state.phase==='victory'){startGame(state.seed,'cathedral',[...state.prelude,...state.history]);return;}
    if((action==='copy-chronicle' || action==='download-chronicle') && state){
      const output=chronicleText(CH().chronicle(state));
      if(action==='download-chronicle'){
        const filename=`${U().fileStem}_${state.seed.replace(/[^a-zA-Z0-9_-]/g,'_')}.txt`;
        // Hosted on claude.ai the frame may not download directly; ask the viewer through the
        // platform's `downloads` capability. The offline single file keeps the plain blob link.
        if(window.claude?.use){
          window.claude.use('downloads').then(downloads=>{
            if(!downloads){toast('\u6B64\u7DB2\u9801\u74B0\u5883\u7121\u6CD5\u4E0B\u8F09\uFF0C\u8ACB\u6539\u7528\u300C\u8907\u88FD\u6211\u7684\u738B\u570B\u6545\u4E8B\u300D');return;}
            return downloads.save({filename,data:'\uFEFF'+output}).then(()=>toast('\u5DF2\u7522\u751F\u6545\u4E8B TXT'));
          }).catch(error=>toast(error?.code==='declined'?'\u5DF2\u53D6\u6D88\u4E0B\u8F09':'\u4E0B\u8F09\u5931\u6557\uFF0C\u8ACB\u6539\u7528\u300C\u8907\u88FD\u6211\u7684\u738B\u570B\u6545\u4E8B\u300D'));
          return;
        }
        const blob=new Blob(['\uFEFF'+output],{type:'text/plain;charset=utf-8'});
        const url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已產生故事 TXT');return;
      }
      const fallbackCopy=()=>{
        const textarea=document.createElement('textarea');textarea.value=output;textarea.style.position='fixed';textarea.style.left='-10000px';
        document.body.append(textarea);textarea.select();
        let ok=false;try{ok=document.execCommand('copy');}catch{}
        textarea.remove();toast(ok?U().copied:'複製功能受瀏覽器限制，請使用下載故事 TXT');
      };
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(output).then(()=>toast(U().copied)).catch(fallbackCopy);
      else fallbackCopy();
      return;
    }
    if(action==='copy-seed'){
      if(navigator.clipboard?.writeText){navigator.clipboard.writeText(state.seed).then(()=>toast('王國代碼已複製')).catch(()=>toast(`王國代碼：${state.seed}`));}
      else toast(`王國代碼：${state.seed}`);
      return;
    }
    if(action==='select' && state?.phase==='editing' && isMulti(DATA())){
      const before=state;state=togglePlacement(state,DATA(),Number(target.dataset.position));
      if(state===before){toast(`這份最多放 ${marksPerDoc(DATA())} 個符號，先點掉一個再換位置`);return;}
      sound('choose');render();return;
    }
    if(action==='select' && state?.phase==='editing'){
      state=selectPosition(state,DATA(),Number(target.dataset.position));
      sound('choose');render();return;
    }
    if(action==='demo' && !state){
      const p=Number(target.dataset.demo);demoPos=demoPos===p?null:p;sound('choose');render();
      root.querySelector(`[data-action="demo"][data-demo="${p}"]`)?.focus({preventScroll:true});return;
    }
    if(action==='mark' && state?.phase==='editing'){
      state=selectMark(state,DATA(),target.dataset.mark);
      sound('choose');render();return;
    }
    if(action==='shift' && state?.phase==='editing'){
      state=selectPosition(state,DATA(),(state.selectedPosition??Math.floor(Array.from(getCurrentLevel(state,DATA()).raw).length/2))+Number(target.dataset.offset));
      sound('choose');render();return;
    }
    if(action==='clear' && state?.phase==='editing'){state=clearPlacements(state);render();return;}
    if(action==='judge' && state?.phase==='editing'){
      if(isMulti(DATA())?(state.placements??[]).length!==marksPerDoc(DATA()):state.selectedPosition===null){toast(isMulti(DATA())?`這份要放滿 ${marksPerDoc(DATA())} 個符號才能蓋章`:'請先任意挑選逗號位置');return;}
      stampNow();return;
    }
    if(action==='advance' && state?.phase==='judgment'){
      state=advanceGame(state);sound(state.phase==='victory'?'win':state.phase==='defeat'?'fail':'start');if(state.phase==='victory'||state.phase==='defeat')cut={type:'finale',won:state.phase==='victory'};render(true);return;
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){helpOpen=!helpOpen;render();event.preventDefault();return;}
    if(helpOpen) return;
    if(event.target instanceof HTMLElement && ['INPUT','TEXTAREA'].includes(event.target.tagName)){
      if(event.key==='Enter' && !state){startGame(event.target.value);event.preventDefault();}
      return;
    }
    if(!state) return;
    if(state.phase==='editing'){
      const level=getCurrentLevel(state,DATA());
      const max=Array.from(level.raw).length;
      if(isMulti(DATA())&&(event.key==='ArrowLeft'||event.key==='ArrowRight'||event.key==='Home'||event.key==='End')){
        const cur=Number(document.activeElement?.dataset?.position??-1);
        const next=event.key==='Home'?0:event.key==='End'?max:cur<0?Math.floor(max/2):Math.max(0,Math.min(max,cur+(event.key==='ArrowLeft'?-1:1)));
        root.querySelector(`[data-action="select"][data-position="${next}"]`)?.focus();event.preventDefault();return;
      }
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'||event.key==='Home'||event.key==='End'){
        const step=event.key==='ArrowLeft'?-1:1;
        const next=event.key==='Home'?0:event.key==='End'?max:state.selectedPosition===null?Math.floor(max/2):Math.max(0,Math.min(max,state.selectedPosition+step));
        state=selectPosition(state,DATA(),next);sound('choose');render();event.preventDefault();return;
      }
      const markKey={'1':'，',',':'，','，':'，','2':'？','?':'？','？':'？','/':'？','3':'！','!':'！','！':'！'}[event.key];
      if(markKey&&multiMark()){state=selectMark(state,DATA(),markKey);sound('choose');render();event.preventDefault();return;}
      if(event.key==='Enter' && (isMulti(DATA())?(state.placements??[]).length===marksPerDoc(DATA()):state.selectedPosition!==null)){stampNow();event.preventDefault();}
    }else if(state.phase==='judgment' && event.key==='Enter'){
      state=advanceGame(state);sound(state.phase==='victory'?'win':state.phase==='defeat'?'fail':'start');if(state.phase==='victory'||state.phase==='defeat')cut={type:'finale',won:state.phase==='victory'};render(true);event.preventDefault();
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMusic();if(audioCtx?.state==='running')void audioCtx.suspend();}else if(state&&!musicOff){startMusic();}});
  render();
})();
