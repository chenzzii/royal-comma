import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COMMA,QUESTION,validateGameData,canSurviveAll,newGame,getCurrentLevel,selectPosition,selectMark,selectChoice,judgeChoice,advanceGame,generateOrder,readingAlternatives,togglePlacement,clearPlacements,marksPerDoc} from '../src/engine.mjs';
import {WORLD_EFFECTS,INITIAL_FACTS,traceWorld,latestReactions,courtBriefing} from '../src/world.mjs';
import {GUILD_WORLD,GUILD_CHAINS,GUILD_BRIEFINGS,GUILD_EFFECTS,GUILD_INITIAL,makeGuildChronicle} from '../src/guild.mjs';
const royal=JSON.parse(fs.readFileSync(new URL('../content/levels.json',import.meta.url)));
const guild=JSON.parse(fs.readFileSync(new URL('../content/guild.json',import.meta.url)));
const level=id=>[...guild.levels,...royal.levels].find(l=>l.id===id);
const entry=key=>{const [stageId,choiceId]=key.split(':');const l=level(stageId),c=l.choices.find(x=>x.id===choiceId);
  return {stageId,choiceId,valid:true,stageTitle:l.title,punctuated:c.rendered};};
const hist=keys=>keys.map(entry);
const fired=(keys,prelude=[])=>traceWorld(hist(keys),GUILD_WORLD,hist(prelude)).steps.flatMap(s=>s.reactions.map(r=>r.id));
const at=(g,id)=>({...g,round:g.order.indexOf(guild.levels.findIndex(l=>l.id===id))});
const place=(g,pairs)=>pairs.reduce((x,[m,p])=>togglePlacement(selectMark(x,guild,m),guild,p),g);
const play=(g,pairs)=>judgeChoice(place(g,pairs),guild);
const ORDERS=Array.from({length:30},(_,i)=>generateOrder(`G-${i}/guild`,guild));
const combo=(bits,order)=>order.map(i=>`${guild.levels[i].id}:${guild.levels[i].choices[(bits>>i)&1].id}`);
const PRELUDES=[[],['L08:B','L04:B','L07:B'],['L01:B','L05:A','L04:A','L08:A'],['L01:A','L02:B','L03:B','L04:B','L05:A','L06:B','L07:B','L08:B']];

test('chapter 2 data: six contracts, exactly two marks each, survivable, readings segment differently',()=>{
  assert.equal(validateGameData(guild),true);
  assert.equal(guild.levels.length,6);
  assert.equal(marksPerDoc(guild),2);
  assert.deepEqual(guild.marks,[COMMA,QUESTION]);
  assert.equal(canSurviveAll(guild),true);
  for(const l of guild.levels)for(const c of l.choices)for(const alt of readingAlternatives(c))assert.equal(alt.length,2,`${l.id}/${c.id}`);
  // v4.5: the two readings never share both slots; several share none at all.
  const shared=l=>{const [a,b]=l.choices.map(c=>c.placements.map(p=>p.at));return a.filter(x=>b.includes(x)).length;};
  assert.ok(guild.levels.every(l=>shared(l)<=1),guild.levels.map(l=>l.id+':'+shared(l)).join(' '));
  assert.ok(guild.levels.filter(l=>shared(l)===0).length>=2);
  const risky=new Set(guild.levels.map(l=>{const [a,b]=l.choices;return (a.chaosDelta>b.chaosDelta?a:b).rendered.includes(QUESTION);}));
  assert.equal(risky.size,2,'riskier reading sometimes has a question mark, sometimes not');
});

test('two marks: both must be right; a shifted boundary is the other reading; aliases count',()=>{
  const g=at(newGame(guild,'TWO'),'G01');
  assert.equal(play(g,[[COMMA,3],[COMMA,8]]).history[0].choiceId,'A');
  assert.equal(play(g,[[COMMA,3],[QUESTION,8]]).history[0].choiceId,'A','alias');
  assert.equal(play(g,[[COMMA,6],[COMMA,9]]).history[0].choiceId,'B');
  assert.equal(play(g,[[COMMA,3],[COMMA,9]]).history[0].valid,false,'one wrong boundary is enough to reject');
  assert.equal(play(g,[[COMMA,6],[COMMA,8]]).history[0].valid,false);
  // One mark is not enough to stamp; a third mark cannot be added; clicking again removes or swaps.
  const one=place(g,[[COMMA,3]]);assert.equal(judgeChoice(one,guild),one);
  const two=place(g,[[COMMA,3],[COMMA,8]]);assert.equal(togglePlacement(two,guild,2),two);
  const removed=togglePlacement(selectMark(two,guild,COMMA),guild,8);assert.equal(removed.placements.length,1);
  const swapped=togglePlacement(selectMark(two,guild,QUESTION),guild,8);assert.deepEqual(swapped.placements.map(p=>p.mark),[COMMA,QUESTION]);
  assert.equal(clearPlacements(two).placements.length,0);
  const judged=play(g,[[COMMA,9],[COMMA,6]]);
  assert.equal(judged.history[0].punctuated,'會長說今年好，晦氣少，不得賠錢');
  assert.equal(advanceGame(judged).placements.length,0);
  const r=newGame(royal,'ROYAL-ONLY');assert.equal(togglePlacement(r,royal,3),r);assert.equal(selectMark(r,royal,QUESTION),r);
});

test('every alternative of every guild reading round-trips through the engine',()=>{
  for(const l of guild.levels)for(const c of l.choices)for(const alt of readingAlternatives(c))for(const pick of [0,-1]){
    const pairs=alt.map(a=>[a.accept.at(pick),a.at]);
    assert.equal(play(at(newGame(guild,'RT'),l.id),pairs).history[0].choiceId,c.id,`${l.id} ${JSON.stringify(pairs)}`);
  }
});

test('chapter 2 plays to victory and to bankruptcy; seed order differs from chapter 1 but is reproducible',()=>{
  let g=newGame(guild,'G-WIN');
  assert.deepEqual(g.order,newGame(guild,'G-WIN').order);
  while(g.phase==='editing'){const l=getCurrentLevel(g,guild),low=l.choices.reduce((a,b)=>a.chaosDelta<b.chaosDelta?a:b);g=advanceGame(judgeChoice(selectChoice(g,guild,low.id),guild));}
  assert.equal(g.phase,'victory');assert.equal(g.history.length,6);assert.equal(g.score,6*65+g.finalBonus);
  g=newGame(guild,'G-LOSE');
  while(g.phase==='editing'){const l=getCurrentLevel(g,guild),hi=l.choices.reduce((a,b)=>a.chaosDelta>b.chaosDelta?a:b);g=advanceGame(judgeChoice(selectChoice(g,guild,hi.id),guild));}
  assert.equal(g.phase,'defeat');
  const withPrelude=newGame(guild,'P',{prelude:[...hist(['L01:B']),{stageId:'L02',valid:false}]});
  assert.deepEqual(withPrelude.prelude.map(h=>h.stageId),['L01']);
});

test('guild chains react in both orders inside chapter 2',()=>{
  const pairs=[['G01:B','G02:B'],['G01:A','G04:B'],['G03:A','G05:A'],['G03:B','G05:B'],['G06:B','G05:A']];
  for(const [a,b] of pairs){
    const ab=fired([a,b]),ba=fired([b,a]);
    assert.ok(ab.length&&ba.length,`${a}/${b}`);
    assert.notDeepEqual(ab,ba);
  }
  for(const c of GUILD_CHAINS){
    assert.notEqual(c.judgment,c.chronicle);
    assert.ok(c.judgment.length>=30&&c.chronicle.length>40,c.id);
  }
});

test('cross-chapter chains need the chapter 1 decision; a direct start never triggers them',()=>{
  const cross=GUILD_CHAINS.filter(c=>c.after.some(k=>k.startsWith('L')));
  assert.ok(cross.length>=6);
  for(const c of cross){
    const royalKeys=c.after.filter(k=>k.startsWith('L')),guildKeys=c.after.filter(k=>k.startsWith('G'));
    assert.ok(fired([...guildKeys,c.on],royalKeys).includes(c.id),`${c.id} should fire with its prelude`);
    assert.ok(!fired([...guildKeys,c.on],[]).includes(c.id),`${c.id} must not fire without chapter 1`);
  }
  for(let bits=0;bits<64;bits++)for(const order of ORDERS.slice(0,5))
    for(const id of fired(combo(bits,order)))assert.ok(!cross.some(c=>c.id===id));
});

test('exhaustive guild combos × orders × preludes: no repeats, causes always earlier',()=>{
  for(const prelude of PRELUDES)for(let bits=0;bits<64;bits++)for(const order of ORDERS){
    const keys=combo(bits,order),{steps}=traceWorld(hist(keys),GUILD_WORLD,hist(prelude));
    const seen=new Set();
    steps.forEach((s,i)=>{for(const r of s.reactions){
      assert.ok(!seen.has(r.id));seen.add(r.id);
      for(const k of r.after)assert.ok(keys.slice(0,i).includes(k)||prelude.includes(k),`${r.id} before ${k}`);
    }});
  }
});

test('guild briefings never leak the current contract readings',()=>{
  const banned=['逗號','問號','位置','較混亂','較安穩','正確答案'];
  for(const prelude of PRELUDES)for(let bits=0;bits<64;bits+=5)for(const order of ORDERS.slice(0,8)){
    const keys=combo(bits,order);
    for(let i=0;i<keys.length;i++){
      const stage=level(keys[i].slice(0,3));
      const lines=courtBriefing(hist(keys.slice(0,i)),stage.id,GUILD_WORLD,hist(prelude));
      const text=lines.join('');
      assert.ok(lines.length>=1&&lines.length<=2);
      if(i>0)for(const w of banned)assert.ok(!text.includes(w),`${stage.id}: ${w} in ${text}`);
      for(const c of stage.choices){
        assert.ok(!text.includes(c.headline));
        for(const part of c.rendered.split(/[，？]/))if(Array.from(part).length>=3)assert.ok(!text.includes(part),`${stage.id} leaks "${part}": ${text}`);
      }
    }
  }
  for(const b of GUILD_BRIEFINGS){
    const effects=b.about.startsWith('L')?WORLD_EFFECTS:GUILD_EFFECTS;
    const base={...INITIAL_FACTS,...GUILD_INITIAL};
    assert.equal(b.when(base),false,b.text);
    assert.equal(b.when(effects[b.about](base)),true,`${b.about}: ${b.text}`);
  }
  assert.notDeepEqual(courtBriefing([],'G01',GUILD_WORLD,[]),courtBriefing([],'G01',GUILD_WORLD,hist(['L01:B'])));
});

test('guild chronicle lists fired chains in order, carries the prelude, and names the fatal contract',()=>{
  const keys=['G06:B','G01:B','G02:B','G03:A','G05:A','G04:B'];
  const game={phase:'victory',seed:'S',history:hist(keys),prelude:hist(['L04:B','L01:B','L07:B']),chaos:4,invalidAttempts:0,riskyCount:4};
  const story=makeGuildChronicle(game);
  const expected=traceWorld(game.history,GUILD_WORLD,game.prelude).steps.flatMap(s=>s.reactions.map(r=>r.title));
  assert.deepEqual(story.connections.map(c=>c.title),expected);
  assert.ok(expected.includes('國王送來的中獎通知')&&expected.includes('櫃台被搬到門外'));
  assert.equal(story.acts.length,2);
  assert.match(story.opening,/王宮/);
  assert.equal(story.title,'《一致地兇》');
  const lost=makeGuildChronicle({phase:'defeat',endingReason:'chaos',seed:'L',history:[...hist(['G02:B']),{stageId:'G01',valid:false,choiceId:null,placements:[],punctuated:'會長說？今年好晦氣少不得賠錢？'}],prelude:[],chaos:7,invalidAttempts:1,riskyCount:1});
  assert.match(lost.epilogue,/會長說？今年好晦氣少不得賠錢？/);
  assert.match(lost.epilogue,/1 份可執行合約/);
  assert.doesNotMatch(lost.opening,/王宮/);
});

