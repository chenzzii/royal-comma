import { insertComma, validateGameData, newGame, getCurrentLevel, getCurrentChoice,
  selectPosition, judgeChoice, advanceGame } from './engine.mjs';
import {makeChronicle} from './epilogue.mjs';
import {courtBriefing, latestReactions} from './world.mjs';

(() => {
  validateGameData(GAME_DATA);
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
  let lastSeed = String(pref.lastSeed || 'ROYAL-001');
  let seedDraft = lastSeed;
  let stageViewKey = '';
  let audioCtx = null;
  let musicPlayer = null; // <audio> fallback only
  let musicVolume = Number.isFinite(Number(pref.musicVolume)) ? Math.min(1,Math.max(0,Number(pref.musicVolume))) : 0.45;
  const bgm = {buffer:null, loading:null, source:null, gain:null, startedAt:0, offset:0, mode:'idle'};

  const escapeHtml = v => String(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const crown = `<svg class="crown-svg" viewBox="0 0 72 56" fill="none" aria-hidden="true"><path d="M7 18L20 28L36 7L51 28L65 18L58 45H14L7 18Z" fill="#EBC573" stroke="#8D5E27" stroke-width="2.5"/><path d="M14 45H58V52H14Z" fill="#E7B85D" stroke="#8D5E27" stroke-width="2.5"/><circle cx="7" cy="17" r="4" fill="#FFE7A1"/><circle cx="36" cy="7" r="4" fill="#FFE7A1"/><circle cx="65" cy="17" r="4" fill="#FFE7A1"/><path d="M36 31L40 36L36 42L32 36Z" fill="#B3334B"/></svg>`;
  const flourish = '<div class="flourish" aria-hidden="true"><span>✦</span><i></i><span>✧</span><i></i><span>✦</span></div>';

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({best, lastSeed, mute, musicOff, musicVolume})); } catch {}
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
  function startGame(seed) {
    lastSeed = (String(seed).trim().slice(0,42) || randomSeed());
    seedDraft = lastSeed;
    state = newGame(GAME_DATA, lastSeed);
    stopMusic(); bgm.offset = 0;
    helpOpen = false;
    persist();
    sound('start');
    startMusic();
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
  function menu() {
    return `<main class="menu-page"><div class="menu-hero"><div class="eyebrow"><span class="diamond">◆</span> 第一章 · 國王的遺囑只有一個逗號 <span class="diamond">◆</span></div>
      <div class="hero-crown">${crown}</div>
      <h1>這個標點符號<br/><em>誰放的？</em></h1>
      <p class="menu-subtitle">你有一個逗號，和讓王國滅亡的權力。</p>
      ${flourish}
      <p class="story-lede">國王身體健康，卻預立了八份沒有標點的遺囑。<br/>依宮廷規定，遺囑必須「生前試行」，以免死後出錯。<br/>沒有人告訴你哪種解讀才算正確。<br/>選擇能造成更大混亂的版本，可以獲得高分——前提是王國還存在。</p>
    </div>
    <div class="menu-options"><div class="menu-options__main"><div class="section-eyebrow">THE FIRST DECREE</div><h2>今日，就職。</h2><label for="seed-input" class="field-label">你的王國代碼 <span>（同一代碼對應相同關卡順序）</span></label><div class="seed-input-row"><input id="seed-input" class="seed-input" type="text" maxlength="42" value="${escapeHtml(seedDraft)}" autocomplete="off" spellcheck="false" aria-label="王國種子代碼"/><button class="btn btn--ghost btn--square" data-action="random-seed" title="產生新代碼" aria-label="產生隨機種子">↻</button></div><button class="btn btn--primary btn--huge" data-action="start">開始閱讀・接受荒謬考績 <span>›</span></button><div class="menu-quick"><button data-action="daily" class="text-button">◈ 今日王國挑戰</button><button data-action="help" class="text-button">玩法與規則</button></div></div>
    <aside class="menu-options__aside"><div class="rule-label">皇家文書局招聘須知</div><div class="rule-item"><span class="rule-icon">，</span><div><strong>一關一個逗號</strong><p>不可更動聖旨上的任何字。</p></div></div><div class="rule-item"><span class="rule-icon">♜</span><div><strong>沒有委託，也沒有答案</strong><p>從語意猜哪種命令會更混亂，只有能執行的解讀才推進劇情。</p></div></div><div class="rule-item"><span class="rule-icon">⚖</span><div><strong>引發混亂才能刷高分</strong><p>較危險的解讀 +180 分；較安穩的 +65 分。錯誤標點混亂 +1 並退件。</p></div></div><div class="warning-strip"><strong>⚠ 國王生前最後的提醒</strong><p>王國混亂達 <b>7</b>，王國就會崩潰並立即結束遊戲。逗號放錯位置也會增加混亂；想得高分，得先讓王國活到第八關！</p></div><div class="personal-best">${best ? `<span>本機最高政績</span><b>${best.toLocaleString('zh-TW')} 分</b>` : '<span>本機尚無通關紀錄</span><b>等待第一位書記官</b>'}</div></aside></div></main>`;
  }
  function metric(label, value, sub, cls='') {return `<div class="metric ${cls}"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`;}
  function getRiskText(delta) {return delta > 0 ? `混亂 +${delta}` : delta < 0 ? `混亂 ${delta}` : '混亂不變';}
  function statusHud() {
    const max=state.settings.chaosLoseAt;
    return `<section class="status-strip" aria-label="王國目前狀態"><div class="stat"><span class="stat__label">目前聖旨</span><strong class="stat__value">${String(Math.min(state.round+1,8)).padStart(2,'0')} <small>/ 08</small></strong></div><div class="stat stat--seals"><span class="stat__label">引發大混亂</span><strong class="stat__value">${state.riskyCount} <small>次</small></strong></div><div class="stat stat--chaos"><span class="stat__label">王國混亂</span><strong class="stat__value stat__value--chaos ${state.chaos>=5?'danger':''}">${state.chaos} <small>/ ${max}</small></strong><div class="chaos-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${state.chaos}"><div style="width:${Math.max(0,Math.min(100,state.chaos/max*100))}%"></div></div></div><div class="stat"><span class="stat__label">荒謬政績</span><strong class="stat__value">${state.score.toLocaleString('zh-TW')}</strong></div></section>`;
  }
  function sentenceSlots(level) {
    const chars=Array.from(level.raw),selected=state.selectedPosition;
    const slot=(i)=>`<button type="button" class="comma-slot ${selected===i?'comma-slot--chosen':''}" data-action="select" data-position="${i}" aria-label="在第 ${i} 字後插入逗號" aria-pressed="${selected===i}" title="把逗號放在這裡">${selected===i?'，':'·'}</button>`;
    return `<div class="sentence" role="group" aria-label="任意選擇逗號位置">${slot(0)}${chars.map((ch,i)=>`<span class="glyph-pair"><span class="glyph">${escapeHtml(ch)}</span>${slot(i+1)}</span>`).join('')}</div>`;
  }
  function briefingCard(level) {
    const lines=courtBriefing(state.history,level.id);
    if(!lines.length)return '';
    return `<aside class="court-briefing" aria-label="宮廷速報"><span class="court-briefing__label">宮廷速報 · 前情</span>${lines.map(t=>`<p>${escapeHtml(t)}</p>`).join('')}</aside>`;
  }
  function chainBlock(entry) {
    if(!entry.valid)return '';
    const chains=latestReactions(state.history);
    if(!chains.length)return '';
    return `<section class="chain-reaction" aria-label="連鎖反應"><span class="chain-reaction__label">◆ 連鎖反應 · 先前的命令找上門了</span>${chains.map(c=>`<div class="chain-reaction__item"><h4>${escapeHtml(c.title)}</h4><p>${escapeHtml(c.judgment)}</p></div>`).join('')}</section>`;
  }
  function gameplay() {
    const level=getCurrentLevel(state,GAME_DATA);
    const position=state.selectedPosition;
    const preview=position===null?'尚未落筆，請點任意字間的「·」。':insertComma(level.raw,position);
    return `<main class="game-page">${statusHud()}<div class="game-layout"><section class="parchment"><div class="parchment__top"><span class="scroll-tag">第 ${state.round+1} 號敕令</span><span>王國歷 ${state.round+1} 日 · 限閱</span></div><div class="royal-insignia">${crown}</div><p class="scroll-kicker">ROYAL DECREE · ${String(state.round+1).padStart(2,'0')}</p><h2 class="stage-title">${escapeHtml(level.title)}</h2><p class="stage-context">${escapeHtml(level.context)}</p>${briefingCard(level)}<div class="decree-box"><div class="decree-caption">未經標點整理的皇家原文</div>${sentenceSlots(level)}<div class="decree-instruction">所有字與字之間、句首及句尾都能放逗號。<b>有效位置不會事先標示。</b></div><div class="punctuation-preview" aria-live="polite"><span>你的標點版本</span><strong>${escapeHtml(preview)}</strong></div><div class="comma-nav"><button type="button" data-action="shift" data-offset="-1" ${position===null||position===0?'disabled':''}>◀ 向左移一格</button><button type="button" data-action="clear" ${position===null?'disabled':''}>移除逗號</button><button type="button" data-action="shift" data-offset="1" ${position===null||position===Array.from(level.raw).length?'disabled':''}>向右移一格 ▶</button></div></div><div class="scroll-footer"><span>任意落筆 · 原文不改 · 蓋章即生效</span><span>皇家第 Ⅷ 號文書令</span></div></section><aside class="mission-panel"><div class="mission-head"><span class="section-eyebrow">READ THE CONSEQUENCES</span><h3>猜猜看，哪種解讀更糟？</h3><p>國王沒有寫委託。你也沒有上帝視角。</p></div><div class="mission-card"><div class="mission-card__badge">盲判混亂 · 沒有標準答案提示</div><p>你的逗號，可能讓王國安定，也可能讓王室醜聞衝上頭條。</p><small>在兩種可執行解讀中，選到<b>較混亂的結果 +180 分</b>，選到<b>較安穩的結果 +65 分</b>。風險與劇情都在蓋章後才揭曉。</small></div><div class="risk-card"><span>唯一確定的行政風險</span><strong>混亂 ${state.chaos} / ${state.settings.chaosLoseAt}</strong><small>逗號任意放，但不是每個位置都能形成命令。無效位置使政策停擺、混亂 +${state.settings.invalidChaosPenalty}，且必須重寫同一關。</small></div><button class="btn btn--stamp" data-action="judge" ${position===null?'disabled':''}><span class="wax-mini">✦</span><span>蓋上皇家印章 <small>${position===null?'請先放好逗號':`${escapeHtml(preview)}・不得反悔`}</small></span></button><div class="aside-note"><b>皇家文書局公告</b><p><strong>混亂達 7，王國立刻崩潰。</strong>你可以追求高分，也可以選擇保命；但只有順利完成八關才有年終績效獎金。</p></div><div class="keyboard-help">鍵盤：<kbd>←</kbd> <kbd>→</kbd> 移逗號 · <kbd>Enter</kbd> 蓋章</div></aside></div></main>`;
  }
  function judgment() {
    const entry=state.history.at(-1),terminal=state.endingReason,invalid=!entry.valid;
    const stampText=invalid?'退件':entry.riskier?'大亂':'核行';
    const title=invalid?'全國官員看不懂聖旨':entry.riskier?'你選中了更混亂的解讀！':'這次王國還算幸運';
    const summary=invalid?'語句無法形成可執行的命令。混亂增加，請在同一關重寫。':entry.riskier?'你在兩種合法解讀中，挑了危險係數較高的一種。':'你採取了兩種合法解讀中相對安穩的一種。';
    const retryStage=invalid&&!terminal;
    return `<main class="judgment-page">${statusHud()}<div class="judgment-card ${invalid?'judgment-card--invalid':''}"><div class="stamp-graphic ${!invalid&&entry.riskier?'stamp-graphic--bad':'stamp-graphic--good'}" aria-hidden="true"><div class="stamp-inner">${stampText}</div></div><p class="scroll-kicker">ROYAL JUDGMENT · ${entry.stageId}</p><h2>${title}</h2><p class="judgment-sub">${summary}</p><div class="judgment-quote">${escapeHtml(entry.punctuated)}</div><div class="meaning-box"><div class="field-label">${invalid?'公文退件理由':'公布的正式解讀'}</div><strong>${escapeHtml(entry.meaning)}</strong></div><div class="story-banner"><span>皇家快報</span><h3>${escapeHtml(entry.headline)}</h3><p>${escapeHtml(entry.scene)}</p><p class="story-after">${escapeHtml(entry.afterword)}</p></div>${chainBlock(entry)}<div class="judgment-metrics">${metric('荒謬政績',`+${entry.scoreEarned} 分`,invalid?'文件退件、不得分':entry.riskier?'高風險解讀獎勵':'穩健解讀基本分',entry.riskier?'bad':'good')}${metric('王國混亂',`${entry.chaosBefore} → ${entry.chaosAfter}`,getRiskText(entry.chaosDelta),entry.chaosDelta>0?'bad':'good')}${metric('本局考驗',invalid?'標點失誤':entry.riskier?'更混亂的解讀':'較安穩的解讀',invalid?'本關不會前進':'比較的是此關的兩種合法解讀')}</div>${terminal?`<div class="terminal-notice ${terminal==='victory'?'terminal-notice--good':''}">${terminal==='victory'?'八份命令全部執行。考績將依國家剩餘程度計算。':'混亂已達到 7 點！朝廷停擺，王國正式崩潰。'}</div>`:''}<button class="btn btn--primary btn--wide" data-action="advance">${terminal==='victory'?'檢視年度荒謬政績':terminal?'前往王國結局':retryStage?'重寫本份聖旨（劇情未前進）':`領取下一份聖旨（第 ${state.round+2} 關）`} <span>›</span></button></div></main>`;
  }
  function ending() {
    const won=state.phase==='victory';
    if(won&&state.score>best){best=state.score;persist();}
    const chronicle=makeChronicle(state);
    const history=state.history.map((e,i)=>`<li class="history-item"><span class="history-index">${String(i+1).padStart(2,'0')}</span><div><strong>${escapeHtml(e.stageTitle)}</strong><p>${escapeHtml(e.punctuated)}</p><small>${escapeHtml(e.consequence)}</small></div><div class="history-result">${!e.valid?pill('退件','bad'):e.riskier?pill('大亂','bad'):pill('求穩','good')}<small>${getRiskText(e.chaosDelta)}</small></div></li>`).join('');
    const base=state.score-state.finalBonus;
    const acts=chronicle.acts.map(a=>`<section class="chronicle-act"><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.text)}</p></section>`).join('');
    const bridges=chronicle.connections.map(c=>`<section class="chronicle-crossover"><span class="chronicle-crossover__label">◆　跨關劇情觸發</span><h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.text)}</p></section>`).join('');
    return `<main class="ending-page"><section class="ending-hero ${won?'ending-hero--win':'ending-hero--lose'}"><div class="hero-crown">${crown}</div><div class="eyebrow">FINAL ROYAL AUDIT</div><h1>${won?'你讓王國勉強活下來。':'你搞丟了一個王國。'}</h1><p>${won?'八份聖旨全部執行，王國尚未滅亡。下面是依照你的決策寫成的王國正史。':'王國混亂值到達 7 點。史官把你的每一道命令編成了一部悲喜劇。'}</p><div class="final-score"><span>荒謬政績</span><strong>${state.score.toLocaleString('zh-TW')}</strong><small>分</small></div>${won?`<div class="bonus-breakdown">冒險與保守決策 ${base} ＋ 王國存續獎金 ${state.finalBonus}</div>`:`<div class="bonus-breakdown">已執行 ${state.history.filter(e=>e.valid).length} 份聖旨、退件 ${state.invalidAttempts} 次。王國滅亡不發年終獎金。</div>`}<div class="end-badges">${pill(`大混亂 ${state.riskyCount} 次`)}${pill(`安穩解讀 ${state.cautiousCount} 次`,'good')}${pill(`混亂 ${state.chaos}/7`,state.chaos>=7?'bad':'neutral')}${pill(`退件 ${state.invalidAttempts} 次`)}</div><div class="end-actions"><button class="btn btn--primary" data-action="retry">同一局再挑戰</button><button class="btn btn--ghost" data-action="new">換一個王國</button></div><div class="seed-footer">本局代碼：${escapeHtml(state.seed)}　<button class="inline-link" data-action="copy-seed">複製代碼</button></div></section><article class="chronicle-book"><div class="section-eyebrow">YOUR PERSONAL ROYAL HISTORY</div><div class="chronicle-heading"><span class="chronicle-seal">✒</span><div><h2>${escapeHtml(chronicle.title)}</h2><small>此篇王國史由你實際執行的聖旨與選擇生成</small></div></div><p class="chronicle-intro">${escapeHtml(chronicle.opening)}</p>${acts}${bridges?`<div class="chronicle-links"><h3>宮廷人物的連鎖報應</h3>${bridges}</div>`:''}<div class="chronicle-finale"><strong>${won?'尾聲：文書局照常上班':'尾聲：王國雖亡，表格猶在'}</strong><p>${escapeHtml(chronicle.epilogue)}</p></div><div class="chronicle-actions"><button class="btn btn--ghost" data-action="copy-chronicle">複製我的王國故事</button><button class="btn btn--ghost" data-action="download-chronicle">下載故事 TXT</button><span>每一條命令都會改寫這部正史</span></div></article><section class="history-card"><div class="section-eyebrow">THE ARCHIVES</div><h2>皇家判決檔案</h2><p>以下保存你實際簽過的每一份命令，包含退件。</p><details class="history-details"><summary>展開逐關紀錄（${state.history.length} 筆）</summary><ol class="history-list">${history}</ol></details></section></main>`;
  }
  function help() {
    if(!helpOpen)return '';
    return `<div class="modal-backdrop" data-action="close-help" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button class="modal-close" aria-label="關閉遊戲規則" data-action="close-help">×</button><span class="section-eyebrow">EMPLOYEE HANDBOOK</span><h2 id="help-title">皇家文書局員工守則 v4.1</h2><ol><li>八份聖旨都少了一個逗號。可以把全形逗號放在<b>任何兩字之間、句首或句尾</b>，不會標示正確位置。</li><li><b>沒有本回合委託。</b>你的挑戰是從兩種可能的解讀，推測哪一種會讓王國更混亂，獲得更多荒謬政績分數。</li><li>每份聖旨只有兩個事先撰寫的可執行解讀；其他位置一律造成<b>施政癱瘓</b>：混亂 +1、退件重寫、本關不前進，也不能得分。</li><li>合法解讀中<b>相對較混亂者 +180 分</b>，相對較安穩者<b> +65 分</b>。你只會在蓋章後看到結果與爆笑宮廷快報。</li><li>真正的混亂變化依劇情決定，可能上升、保持或下降；高分不代表安全。<b>混亂達到 7 點，王國立刻崩潰。</b></li><li>王國會記得你做過的事：先前執行的命令會出現在下一份聖旨的<b>宮廷速報</b>，也可能在蓋章後引發<b>連鎖反應</b>。速報只報導已發生的事，不會透露逗號位置。</li><li>順利完成八份聖旨就勝利，依剩餘王國穩定度加發年終獎金。相同的王國種子有相同關卡順序。</li><li>背景音樂是約 66 秒、32 小節的原創滑稽宮廷小曲，採用笛聲、彈撥和笨重低音；不是參考歌曲的旋律重現；音樂和蓋章音效可分別開關。</li></ol><div class="sound-settings"><label for="music-volume">背景音樂音量 <output id="music-volume-value">${Math.round(musicVolume*100)}%</output></label><input id="music-volume" type="range" min="0" max="100" step="5" value="${Math.round(musicVolume*100)}" aria-label="背景音樂音量"/><small>音樂與蓋章音效也可以用右上角按鈕分別開關。</small></div><div class="help-keys"><kbd>←</kbd> / <kbd>→</kbd> 移動逗號　<kbd>Enter</kbd> 提交／下一關　<kbd>Esc</kbd> 說明</div><button class="btn btn--primary btn--wide" data-action="close-help">知道了，讓國家安全地混亂</button></section></div>`;
  }
  function focusDescriptor() {
    const el=document.activeElement;
    if(!el||el===document.body||!root.contains(el))return null;
    if(el.dataset?.action)return {action:el.dataset.action,position:el.dataset.position??null};
    return el.id?{id:el.id}:null;
  }
  function restoreFocus(d) {
    if(!d)return;
    const target=d.id?document.getElementById(d.id)
      :root.querySelector(d.position!==null?`[data-action="${d.action}"][data-position="${d.position}"]`:`[data-action="${d.action}"]`);
    const chosen=d.action==='select'&&state?.phase==='editing'&&state.selectedPosition!==null
      ?root.querySelector(`[data-action="select"][data-position="${state.selectedPosition}"]`):null;
    const el=chosen||target;
    if(el&&!el.disabled)el.focus({preventScroll:true});
  }
  function render(resetScroll=false) {
    const focus = resetScroll ? null : focusDescriptor();
    const key = state ? `${state.phase}-${state.round}` : 'menu';
    root.innerHTML = `${topbar()}${state ? state.phase==='editing'?gameplay():state.phase==='judgment'?judgment():ending():menu()}<footer class="site-footer">© 皇家文書局　·　所有人物與政變均屬虛構　·　原創網頁遊戲 v4.1</footer>${help()}<div class="toast" role="status" aria-live="polite" id="toast"></div>`;
    if (resetScroll || key !== stageViewKey) window.scrollTo({top:0,behavior:'instant'});
    stageViewKey = key;
    restoreFocus(focus);
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
  root.addEventListener('click',event=> {
    const target=event.target.closest('[data-action]');
    if (!target) return;
    const action=target.dataset.action;
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
    if(action==='new'){startGame(randomSeed());return;}
    if(action==='retry'){startGame(state.seed);return;}
    if((action==='copy-chronicle' || action==='download-chronicle') && state){
      const story=makeChronicle(state);
      const output=[story.title,story.opening,...story.acts.flatMap(a=>[a.title,a.text]),...story.connections.flatMap(c=>[c.title,c.text]),'尾聲',story.epilogue].join('\n\n');
      if(action==='download-chronicle'){
        const filename=`\u7687\u5BB6\u6B63\u53F2_${state.seed.replace(/[^a-zA-Z0-9_-]/g,'_')}.txt`;
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
        a.href=url;a.download=`皇家正史_${state.seed.replace(/[^a-zA-Z0-9_-]/g,'_')}.txt`;document.body.append(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已產生故事 TXT');return;
      }
      const fallbackCopy=()=>{
        const textarea=document.createElement('textarea');textarea.value=output;textarea.style.position='fixed';textarea.style.left='-10000px';
        document.body.append(textarea);textarea.select();
        let ok=false;try{ok=document.execCommand('copy');}catch{}
        textarea.remove();toast(ok?'已複製王國故事':'複製功能受瀏覽器限制，請使用下載故事 TXT');
      };
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(output).then(()=>toast('已複製王國故事')).catch(fallbackCopy);
      else fallbackCopy();
      return;
    }
    if(action==='copy-seed'){
      if(navigator.clipboard?.writeText){navigator.clipboard.writeText(state.seed).then(()=>toast('王國代碼已複製')).catch(()=>toast(`王國代碼：${state.seed}`));}
      else toast(`王國代碼：${state.seed}`);
      return;
    }
    if(action==='select' && state?.phase==='editing'){
      state=selectPosition(state,GAME_DATA,Number(target.dataset.position));
      sound('choose');render();return;
    }
    if(action==='shift' && state?.phase==='editing'){
      state=selectPosition(state,GAME_DATA,(state.selectedPosition??Math.floor(Array.from(getCurrentLevel(state,GAME_DATA).raw).length/2))+Number(target.dataset.offset));
      sound('choose');render();return;
    }
    if(action==='clear' && state?.phase==='editing'){state={...state,selectedPosition:null,selectedChoiceId:null};render();return;}
    if(action==='judge' && state?.phase==='editing'){
      if(state.selectedPosition===null){toast('請先任意挑選逗號位置');return;}
      state=judgeChoice(state,GAME_DATA);
      sound('stamp');if(!state.history.at(-1).valid)sound('confusion');render(true);return;
    }
    if(action==='advance' && state?.phase==='judgment'){
      state=advanceGame(state);sound(state.phase==='victory'?'win':state.phase==='defeat'?'fail':'start');render(true);return;
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
      const level=getCurrentLevel(state,GAME_DATA);
      const max=Array.from(level.raw).length;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'||event.key==='Home'||event.key==='End'){
        const step=event.key==='ArrowLeft'?-1:1;
        const next=event.key==='Home'?0:event.key==='End'?max:state.selectedPosition===null?Math.floor(max/2):Math.max(0,Math.min(max,state.selectedPosition+step));
        state=selectPosition(state,GAME_DATA,next);sound('choose');render();event.preventDefault();return;
      }
      if(event.key==='Enter' && state.selectedPosition!==null){state=judgeChoice(state,GAME_DATA);sound('stamp');if(!state.history.at(-1).valid)sound('confusion');render(true);event.preventDefault();}
    }else if(state.phase==='judgment' && event.key==='Enter'){
      state=advanceGame(state);sound(state.phase==='victory'?'win':state.phase==='defeat'?'fail':'start');render(true);event.preventDefault();
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMusic();if(audioCtx?.state==='running')void audioCtx.suspend();}else if(state&&!musicOff){startMusic();}});
  render();
})();
