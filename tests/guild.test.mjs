import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COMMA,QUESTION,validateGameData,canSurviveAll,newGame,getCurrentLevel,selectPosition,selectMark,selectChoice,judgeChoice,advanceGame,generateOrder,placementsOf} from '../src/engine.mjs';
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
const play=(g,mark,pos)=>judgeChoice(selectPosition(selectMark(g,guild,mark),guild,pos),guild);
const ORDERS=Array.from({length:30},(_,i)=>generateOrder(`G-${i}/guild`,guild));
const combo=(bits,order)=>order.map(i=>`${guild.levels[i].id}:${guild.levels[i].choices[(bits>>i)&1].id}`);
const PRELUDES=[[],['L08:B','L04:B','L07:B'],['L01:B','L05:A','L04:A','L08:A'],['L01:A','L02:B','L03:B','L04:B','L05:A','L06:B','L07:B','L08:B']];

test('chapter 2 data: six contracts, comma or question mark, survivable, varied reading types',()=>{
  assert.equal(validateGameData(guild),true);
  assert.equal(guild.levels.length,6);
  assert.deepEqual(guild.marks,[COMMA,QUESTION]);
  assert.equal(canSurviveAll(guild),true);
  const kinds=guild.levels.map(l=>{const [a,b]=l.choices;
    return a.insertAfter===b.insertAfter?'same-slot-different-mark':a.mark===QUESTION&&b.mark===QUESTION?'two-questions':a.mark!==b.mark?'comma-vs-question':'two-commas';});
  for(const k of ['same-slot-different-mark','two-questions','comma-vs-question','two-commas'])assert.ok(kinds.includes(k),`missing ${k}: ${kinds}`);
  const riskyMarks=new Set(guild.levels.map(l=>{const [a,b]=l.choices;return (a.chaosDelta>b.chaosDelta?a:b).mark;}));
  assert.deepEqual([...riskyMarks].sort(),[COMMA,QUESTION].sort(),'the riskier reading must not always use the same mark');
  for(const l of guild.levels)for(const c of l.choices)assert.ok(!c.rendered.endsWith(COMMA));
});

test('mark choice: same slot with a different mark is a different reading; aliases execute their reading',()=>{
  let g=at(newGame(guild,'MARKS'),'G06');
  const comma=play(g,COMMA,6),question=play(g,QUESTION,6);
  assert.equal(comma.history[0].choiceId,'A');assert.equal(question.history[0].choiceId,'B');
  assert.equal(question.history[0].punctuated,'會長從不說謊？全城都知道');
  assert.equal(question.history[0].mark,QUESTION);
  g=at(newGame(guild,'ALIAS'),'G01');
  const alias=play(g,QUESTION,5),primary=play(g,COMMA,5);
  assert.equal(alias.history[0].choiceId,'A');assert.equal(primary.history[0].choiceId,'A');
  assert.equal(alias.history[0].punctuated,'會長退休了？沒人反對');
  const endQuestion=play(at(newGame(guild,'END'),'G06'),QUESTION,11);
  assert.equal(endQuestion.history[0].valid,false);assert.equal(endQuestion.chaos,1);
  // Changing the mark after choosing a slot re-evaluates the same slot.
  let s=selectPosition(at(newGame(guild,'SWAP'),'G03'),guild,8);
  assert.equal(s.selectedMark,COMMA,'chapter 2 starts with the comma selected');
  assert.equal(s.selectedChoiceId,'A');
  s=selectMark(s,guild,QUESTION);assert.equal(s.selectedChoiceId,'B');
  s=selectMark(s,guild,COMMA);assert.equal(s.selectedChoiceId,'A');
  // Chapter 1 has only commas: a question mark cannot be selected there.
  const r=newGame(royal,'ROYAL-ONLY');assert.equal(selectMark(r,royal,QUESTION),r);
  assert.equal(r.selectedMark,COMMA);
});

test('every placement of every guild reading round-trips through the engine',()=>{
  for(const l of guild.levels)for(const c of l.choices)for(const [m,p] of placementsOf(c)){
    const g=play(at(newGame(guild,'RT'),l.id),m,p);
    assert.equal(g.history[0].choiceId,c.id,`${l.id} ${m}@${p}`);
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
  const pairs=[['G02:B','G03:A'],['G06:B','G01:B'],['G04:A','G05:B'],['G05:A','G06:A'],['G03:B','G04:B']];
  for(const [a,b] of pairs){
    const ab=fired([a,b]),ba=fired([b,a]);
    assert.ok(ab.length&&ba.length,`${a}/${b}`);
    assert.notDeepEqual(ab,ba);
  }
  for(const c of GUILD_CHAINS){
    assert.notEqual(c.judgment,c.chronicle);
    assert.ok(c.judgment.length>=30&&c.chronicle.length>40,c.id);
    assert.ok(!fired([c.on,...c.after.filter(k=>k.startsWith('G'))]).includes(c.id)||c.after.every(k=>k.startsWith('L')),`${c.id} fired in reverse order`);
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
  const keys=['G02:B','G03:A','G06:B','G01:B','G04:A','G05:B'];
  const game={phase:'victory',seed:'S',history:hist(keys),prelude:hist(['L08:B','L04:B']),chaos:4,invalidAttempts:0,riskyCount:4};
  const story=makeGuildChronicle(game);
  const expected=traceWorld(game.history,GUILD_WORLD,game.prelude).steps.flatMap(s=>s.reactions.map(r=>r.title));
  assert.deepEqual(story.connections.map(c=>c.title),expected);
  assert.ok(expected.includes('國王送來的中獎通知'));
  assert.equal(story.acts.length,2);
  assert.match(story.opening,/王宮/);
  assert.equal(story.title,'《禮物經濟學》');
  const lost=makeGuildChronicle({phase:'defeat',endingReason:'chaos',seed:'L',history:[...hist(['G02:B']),{stageId:'G06',valid:false,choiceId:null,mark:QUESTION,position:11,punctuated:'會長從不說謊全城都知道？'}],prelude:[],chaos:7,invalidAttempts:1,riskyCount:1});
  assert.match(lost.epilogue,/會長從不說謊全城都知道？/);
  assert.match(lost.epilogue,/1 份可執行合約/);
  assert.doesNotMatch(lost.opening,/王宮/);
});
