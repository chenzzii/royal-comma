import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newGame,getCurrentLevel,selectChoice,judgeChoice,advanceGame,generateOrder} from '../src/engine.mjs';
import {CHAINS,BRIEFINGS,FIRST_BRIEFING,traceWorld,latestReactions,courtBriefing} from '../src/world.mjs';
import {makeChronicle} from '../src/epilogue.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../content/levels.json',import.meta.url)));
const level=id=>data.levels.find(l=>l.id===id);
const entry=key=>{const [stageId,choiceId]=key.split(':');const l=level(stageId),c=l.choices.find(x=>x.id===choiceId);
  return {stageId,choiceId,valid:true,stageTitle:l.title,punctuated:c.rendered};};
const hist=keys=>keys.map(entry);
const firedIds=keys=>traceWorld(hist(keys)).steps.flatMap(s=>s.reactions.map(r=>r.id));
const comboKeys=(bits,order)=>order.map(i=>`${data.levels[i].id}:${data.levels[i].choices[(bits>>i)&1].id}`);
const SAMPLE_ORDERS=Array.from({length:40},(_,i)=>generateOrder(`ORDER-${i}`,data));

test('hidden comma slots are no longer a fixed pattern across decrees',()=>{
  const pairs=data.levels.map(l=>l.choices.map(c=>c.insertAfter).sort((a,b)=>a-b).join('/'));
  const lengths=new Set(data.levels.map(l=>Array.from(l.raw).length));
  assert.ok(new Set(pairs).size>=4,`only ${new Set(pairs).size} distinct slot pairs: ${pairs}`);
  assert.ok(lengths.size>=3,'decree lengths should vary');
  for(const p of new Set(pairs))assert.ok(pairs.filter(x=>x===p).length<=2,`slot pair ${p} used too often`);
  // Riskier reading sits at the earlier slot in some decrees and the later slot in others.
  const riskyEarly=data.levels.map(l=>{const [a,b]=l.choices;const r=a.chaosDelta>b.chaosDelta?a:b,o=r===a?b:a;return r.insertAfter<o.insertAfter;});
  assert.ok(riskyEarly.includes(true)&&riskyEarly.includes(false));
  assert.equal(new Set(data.levels.map(l=>l.raw)).size,8);
});

test('world trace is deterministic and only uses decrees already executed',()=>{
  const keys=comboKeys(0b10110101,SAMPLE_ORDERS[3]);
  assert.deepEqual(traceWorld(hist(keys)),traceWorld(hist(keys)));
  assert.deepEqual(traceWorld([]).steps,[]);
  const withInvalid=[{stageId:'L01',choiceId:null,valid:false},...hist(keys)];
  assert.deepEqual(traceWorld(withInvalid).steps.map(s=>s.key),keys);
});

test('every chain fires after its prerequisites and never in the reverse order',()=>{
  for(const chain of CHAINS){
    const forward=[...chain.after,chain.on];
    const forwardHist=hist(forward);
    const step=traceWorld(forwardHist).steps.at(-1);
    if(!chain.when||chain.when(traceWorld(hist(chain.after)).facts))
      assert.ok(step.reactions.some(r=>r.id===chain.id),`${chain.id} should fire for ${forward}`);
    const reversed=[chain.on,...chain.after];
    assert.ok(!firedIds(reversed).includes(chain.id),`${chain.id} must not fire for ${reversed}`);
    assert.ok(chain.judgment.length>=30&&chain.chronicle.length>40,chain.id);
    assert.notEqual(chain.judgment,chain.chronicle,`${chain.id} chronicle repeats judgment verbatim`);
  }
  assert.equal(new Set(CHAINS.map(c=>c.id)).size,CHAINS.length);
});

test('six causal chains react in BOTH orders with different text',()=>{
  const pairs=[['L01:B','L06:B'],['L01:A','L06:B'],['L01:B','L06:A'],['L01:A','L06:A'],
    ['L03:B','L07:B'],['L02:B','L05:B'],['L04:A','L06:A'],['L04:A','L06:B'],['L04:B','L06:B'],['L05:A','L07:B'],['L07:B','L08:B'],['L05:A','L08:A']];
  const groups=new Set();
  for(const [a,b] of pairs){
    const ab=traceWorld(hist([a,b])).steps.at(-1).reactions,ba=traceWorld(hist([b,a])).steps.at(-1).reactions;
    assert.ok(ab.length&&ba.length,`${a}→${b} and ${b}→${a} both need a reaction`);
    assert.notEqual(ab[0].judgment,ba[0].judgment);
    groups.add([a,b].map(k=>k.slice(0,3)).sort().join('×'));
  }
  assert.ok(groups.size>=6,[...groups].join(','));
});

test('princess location stays consistent: tower gold only while she is still in the tower',()=>{
  assert.ok(firedIds(['L01:A','L08:A']).includes('tower-basket'));
  assert.ok(!firedIds(['L01:A','L06:B','L08:A']).includes('tower-basket'),'she climbed down to marry');
  assert.ok(firedIds(['L06:B','L01:A','L08:A']).includes('tower-basket'),'trapped again after the wedding');
  assert.ok(!firedIds(['L01:B','L08:A']).includes('tower-basket'));
  assert.equal(traceWorld(hist(['L01:A','L06:B'])).facts.princess,'free');
});

test('exhaustive combos × sampled orders: no chain repeats or fires before its cause',()=>{
  let fired=0;
  for(let bits=0;bits<256;bits++)for(const order of SAMPLE_ORDERS){
    const keys=comboKeys(bits,order),{steps}=traceWorld(hist(keys));
    const seenChains=new Set();
    steps.forEach((s,i)=>{for(const r of s.reactions){
      assert.equal(r.on,s.key);
      assert.ok(!seenChains.has(r.id));seenChains.add(r.id);
      for(const k of r.after)assert.ok(keys.slice(0,i).includes(k),`${r.id} fired before ${k}`);
      fired++;
    }});
  }
  assert.ok(fired>0);
});

test('court briefing never leaks the current decree readings or hints',()=>{
  const banned=['逗號','位置','較混亂','較安穩','正確答案','高風險','保守'];
  for(let bits=0;bits<256;bits+=3)for(const order of SAMPLE_ORDERS.slice(0,12)){
    const keys=comboKeys(bits,order);
    for(let i=0;i<keys.length;i++){
      const stage=level(keys[i].slice(0,3));
      const lines=courtBriefing(hist(keys.slice(0,i)),stage.id);
      assert.ok(lines.length>=1&&lines.length<=2);
      if(i===0)assert.deepEqual(lines,[FIRST_BRIEFING]);
      const text=lines.join('');
      for(const word of banned)assert.ok(!text.includes(word),`${stage.id}: ${word}`);
      for(const c of stage.choices){
        assert.ok(!text.includes(c.headline),`${stage.id} briefing leaks headline`);
        for(const part of c.rendered.split('，'))if(Array.from(part).length>=4)assert.ok(!text.includes(part),`${stage.id} briefing leaks "${part}"`);
      }
    }
  }
  for(const b of BRIEFINGS)assert.ok(data.levels.some(l=>l.id===b.stage));
});

test('chronicle lists every fired chain once, in order, with no four-item cap',()=>{
  let maxShown=0;
  for(let bits=0;bits<256;bits++){
    const order=SAMPLE_ORDERS[bits%SAMPLE_ORDERS.length],keys=comboKeys(bits,order);
    const game={phase:'victory',seed:'S',history:hist(keys),chaos:3,invalidAttempts:0,riskyCount:3};
    const expected=traceWorld(game.history).steps.flatMap(s=>s.reactions.map(r=>r.title));
    const story=makeChronicle(game);
    assert.deepEqual(story.connections.map(c=>c.title),expected);
    const judged=new Set(CHAINS.map(c=>c.judgment));
    for(const c of story.connections)assert.ok(!judged.has(c.text));
    maxShown=Math.max(maxShown,story.connections.length);
  }
  assert.ok(maxShown>4,`expected some runs with more than four chains, got ${maxShown}`);
});

test('in a real engine run the judgment of the later decree carries the chain, both orders',()=>{
  const seeds={};
  for(let i=0;i<500&&Object.keys(seeds).length<2;i++){
    const seed=`CHAIN-${i}`,o=generateOrder(seed,data),a=o.indexOf(0),b=o.indexOf(5);
    seeds[a<b?'rescueFirst':'weddingFirst']??=seed;
  }
  for(const [label,seed] of Object.entries(seeds)){
    let g=newGame(data,seed),seen=[];
    while(g.phase==='editing'){
      const l=getCurrentLevel(g,data),pick=['L01','L06'].includes(l.id)?l.choices.find(c=>c.id==='B'):l.choices.reduce((x,y)=>x.chaosDelta<y.chaosDelta?x:y);
      g=judgeChoice(selectChoice(g,data,pick.id),data);
      seen.push(...latestReactions(g.history).map(r=>r.id));
      g=advanceGame(g);
    }
    assert.equal(g.phase,'victory');
    assert.ok(seen.includes(label==='rescueFirst'?'bear-wedding':'newlywed-rescue'),`${label}: ${seen}`);
  }
  assert.equal(Object.keys(seeds).length,2);
  const invalid=[...hist(['L01:B']),{stageId:'L06',choiceId:null,valid:false}];
  assert.deepEqual(latestReactions(invalid),[]);
});

test('each briefing is tagged with the decree that makes it true',async()=>{
  const {INITIAL_FACTS,WORLD_EFFECTS}=await import('../src/world.mjs');
  for(const b of BRIEFINGS){
    assert.ok(WORLD_EFFECTS[b.about],b.text);
    assert.equal(b.when(INITIAL_FACTS),false,`${b.text} should need a prior decree`);
    assert.equal(b.when(WORLD_EFFECTS[b.about](INITIAL_FACTS)),true,`${b.about} should enable: ${b.text}`);
    assert.notEqual(b.about.slice(0,3),b.stage,'a briefing cannot talk about its own decree');
  }
  // Stage note and ripple never come from the same decree.
  const lines=courtBriefing(hist(['L04:B']),'L08');
  assert.deepEqual(lines,['國王面前這箱金幣，其實有一半已經匯給了魔王。']);
});

test('premise is consistent: the king is alive and trialling his own will',()=>{
  const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
  const playerText=['content/levels.json','src/app.mjs','src/epilogue.mjs','src/world.mjs','src/shell.html'].map(read).join('\n');
  for(const word of ['駕崩','過世','去世','逝世','已故','亡靈'])assert.ok(!playerText.includes(word),`dead-king wording left: ${word}`);
  assert.match(read('src/app.mjs'),/生前試行/);
  assert.match(FIRST_BRIEFING,/遺囑試辦/);
});
