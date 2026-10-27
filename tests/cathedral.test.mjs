import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COMMA,QUESTION,EXCLAIM,validateGameData,canSurviveAll,newGame,getCurrentLevel,selectPosition,selectMark,selectChoice,judgeChoice,advanceGame,generateOrder,placementsOf} from '../src/engine.mjs';
import {WORLD_EFFECTS,INITIAL_FACTS,traceWorld,courtBriefing} from '../src/world.mjs';
import {GUILD_EFFECTS,GUILD_INITIAL} from '../src/guild.mjs';
import {CATHEDRAL_WORLD,CATHEDRAL_CHAINS,CATHEDRAL_BRIEFINGS,CATHEDRAL_EFFECTS,CATHEDRAL_INITIAL,makeCathedralChronicle} from '../src/cathedral.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(`../content/${f}`,import.meta.url)));
const royal=read('levels.json'),guild=read('guild.json'),cath=read('cathedral.json');
const level=id=>[...cath.levels,...guild.levels,...royal.levels].find(l=>l.id===id);
const entry=key=>{const [stageId,choiceId]=key.split(':');const l=level(stageId),c=l.choices.find(x=>x.id===choiceId);
  return {stageId,choiceId,valid:true,stageTitle:l.title,punctuated:c.rendered};};
const hist=keys=>keys.map(entry);
const fired=(keys,prelude=[])=>traceWorld(hist(keys),CATHEDRAL_WORLD,hist(prelude)).steps.flatMap(s=>s.reactions.map(r=>r.id));
const at=(g,id)=>({...g,round:g.order.indexOf(cath.levels.findIndex(l=>l.id===id))});
const play=(g,mark,pos)=>judgeChoice(selectPosition(selectMark(g,cath,mark),cath,pos),cath);
const ORDERS=Array.from({length:30},(_,i)=>generateOrder(`C-${i}/cathedral`,cath));
const combo=(bits,order)=>order.map(i=>`${cath.levels[i].id}:${cath.levels[i].choices[(bits>>i)&1].id}`);
const PRELUDES=[[],['L01:B','L05:B','L04:A','L07:B'],['G02:B','G06:B','G01:B','G05:A'],
  ['L01:B','L04:A','L05:B','L07:B','G01:B','G02:B','G05:A','G06:B'],['L01:A','L08:B','G03:B','G04:A']];

test('chapter 3 data: six notices, three marks, exclamation matters, survivable',()=>{
  assert.equal(validateGameData(cath),true);
  assert.equal(cath.levels.length,6);
  assert.deepEqual(cath.marks,[COMMA,QUESTION,EXCLAIM]);
  assert.equal(canSurviveAll(cath),true);
  const primaryExclaim=cath.levels.filter(l=>l.choices.some(c=>c.mark===EXCLAIM));
  assert.ok(primaryExclaim.length>=3,'exclamation must be a primary reading in several notices');
  const pairs=new Set(cath.levels.map(l=>l.choices.map(c=>c.mark).sort().join('')));
  assert.ok(pairs.size>=4,`mark pairings should vary: ${[...pairs]}`);
  assert.ok(cath.levels.some(l=>l.choices[0].insertAfter===l.choices[1].insertAfter&&l.choices.some(c=>c.mark===EXCLAIM)),'need a same-slot notice that hinges on ！');
  const risky=new Set(cath.levels.map(l=>{const [a,b]=l.choices;return (a.chaosDelta>b.chaosDelta?a:b).mark;}));
  assert.equal(risky.size,3,'riskier reading should use each mark somewhere');
  for(const l of cath.levels)assert.ok(!royal.levels.some(r=>r.raw===l.raw)&&!guild.levels.some(g=>g.raw===l.raw));
});

test('exclamation vs comma at the same slot are different readings; aliases execute their reading',()=>{
  const fire=at(newGame(cath,'FIRE'),'C02');
  assert.equal(play(fire,COMMA,5).history[0].choiceId,'A');
  assert.equal(play(fire,EXCLAIM,5).history[0].choiceId,'B');
  assert.equal(play(fire,QUESTION,5).history[0].valid,false);
  const pope=at(newGame(cath,'POPE'),'C05');
  assert.equal(play(pope,EXCLAIM,8).history[0].choiceId,'A');
  assert.equal(play(pope,QUESTION,8).history[0].choiceId,'B');
  assert.equal(play(pope,EXCLAIM,8).history[0].punctuated,'教宗下週要退位了！');
  for(const l of cath.levels)for(const c of l.choices)for(const [m,p] of placementsOf(c))
    assert.equal(play(at(newGame(cath,'RT'),l.id),m,p).history[0].choiceId,c.id,`${l.id} ${m}@${p}`);
  // Chapters 1 and 2 cannot use the exclamation mark.
  const r=newGame(royal,'R'),g=newGame(guild,'G');
  assert.equal(selectMark(r,royal,EXCLAIM),r);assert.equal(selectMark(g,guild,EXCLAIM),g);
});

test('chapter 3 plays to victory and to schism',()=>{
  let g=newGame(cath,'C-WIN');
  while(g.phase==='editing'){const l=getCurrentLevel(g,cath),low=l.choices.reduce((a,b)=>a.chaosDelta<b.chaosDelta?a:b);g=advanceGame(judgeChoice(selectChoice(g,cath,low.id),cath));}
  assert.equal(g.phase,'victory');assert.equal(g.history.length,6);
  g=newGame(cath,'C-LOSE');
  while(g.phase==='editing'){const l=getCurrentLevel(g,cath),hi=l.choices.reduce((a,b)=>a.chaosDelta>b.chaosDelta?a:b);g=advanceGame(judgeChoice(selectChoice(g,cath,hi.id),cath));}
  assert.equal(g.phase,'defeat');
});

test('chapter 3 chains react in both orders',()=>{
  for(const [a,b] of [['C02:A','C04:B'],['C03:B','C01:B'],['C05:A','C06:A'],['C03:A','C04:A'],['C02:B','C05:B']]){
    const ab=fired([a,b]),ba=fired([b,a]);
    assert.ok(ab.length&&ba.length,`${a}/${b}`);assert.notDeepEqual(ab,ba);
  }
  for(const c of CATHEDRAL_CHAINS){assert.notEqual(c.judgment,c.chronicle);assert.ok(c.judgment.length>=30&&c.chronicle.length>40,c.id);}
});

test('cross-chapter chains: chapter 1 and chapter 2 decisions both reach chapter 3, only through the prelude',()=>{
  const cross=CATHEDRAL_CHAINS.filter(c=>c.after.some(k=>!k.startsWith('C')));
  assert.ok(cross.some(c=>c.after.some(k=>k.startsWith('L')))&&cross.some(c=>c.after.some(k=>k.startsWith('G'))));
  for(const c of cross){
    const outside=c.after.filter(k=>!k.startsWith('C')),inside=c.after.filter(k=>k.startsWith('C'));
    assert.ok(fired([...inside,c.on],outside).includes(c.id),`${c.id} with prelude`);
    assert.ok(!fired([...inside,c.on],[]).includes(c.id),`${c.id} without prelude`);
  }
  // Chapter 2 facts arrive in chapter 3 together with the chapter 1 facts that shaped chapter 2.
  const start=traceWorld([],CATHEDRAL_WORLD,hist(['L08:B','G03:B','G06:B']));
  assert.equal(start.facts.princeBroke,true);assert.equal(start.facts.princeWorksAtGuild,true);assert.equal(start.facts.ironicSign,true);
  assert.ok(['L08:B','G03:B','G06:B'].every(k=>start.priorKeys.has(k)));
});

test('exhaustive chapter 3 combos × orders × preludes: no repeats, causes always earlier',()=>{
  for(const prelude of PRELUDES)for(let bits=0;bits<64;bits++)for(const order of ORDERS){
    const keys=combo(bits,order),{steps}=traceWorld(hist(keys),CATHEDRAL_WORLD,hist(prelude));
    const seen=new Set();
    steps.forEach((s,i)=>{for(const r of s.reactions){
      assert.ok(!seen.has(r.id));seen.add(r.id);
      for(const k of r.after)assert.ok(keys.slice(0,i).includes(k)||prelude.includes(k),`${r.id} before ${k}`);
    }});
  }
});

test('chapter 3 briefings never leak the current notice readings',()=>{
  const banned=['逗號','問號','驚嘆號','位置','較混亂','較安穩','正確答案'];
  for(const prelude of PRELUDES)for(let bits=0;bits<64;bits+=5)for(const order of ORDERS.slice(0,8)){
    const keys=combo(bits,order);
    for(let i=0;i<keys.length;i++){
      const stage=level(keys[i].slice(0,3));
      const lines=courtBriefing(hist(keys.slice(0,i)),stage.id,CATHEDRAL_WORLD,hist(prelude));
      const text=lines.join('');
      assert.ok(lines.length>=1&&lines.length<=2);
      if(i>0)for(const w of banned)assert.ok(!text.includes(w),`${stage.id}: ${w} in ${text}`);
      for(const c of stage.choices){
        assert.ok(!text.includes(c.headline));
        for(const part of c.rendered.split(/[，？！]/))if(Array.from(part).length>=3)assert.ok(!text.includes(part),`${stage.id} leaks "${part}": ${text}`);
      }
    }
  }
  const base={...INITIAL_FACTS,...GUILD_INITIAL,...CATHEDRAL_INITIAL};
  for(const b of CATHEDRAL_BRIEFINGS){
    const effects=b.about.startsWith('L')?WORLD_EFFECTS:b.about.startsWith('G')?GUILD_EFFECTS:CATHEDRAL_EFFECTS;
    assert.equal(b.when(base),false,b.text);
    assert.equal(b.when(effects[b.about](base)),true,`${b.about}: ${b.text}`);
  }
  const none=courtBriefing([],'C01',CATHEDRAL_WORLD,[])[0],one=courtBriefing([],'C01',CATHEDRAL_WORLD,hist(['L01:B']))[0],two=courtBriefing([],'C01',CATHEDRAL_WORLD,hist(['L01:B','G01:A']))[0];
  assert.equal(new Set([none,one,two]).size,3);assert.match(two,/商會/);
});

test('chapter 3 chronicle: fired chains in order, prelude-aware opening, fatal notice named',()=>{
  const game={phase:'victory',seed:'S',history:hist(['C05:A','C06:A','C03:B','C01:B']).concat(hist(['C02:A','C04:B'])),
    prelude:hist(['L01:B','G02:B']),chaos:5,invalidAttempts:0,riskyCount:4};
  const story=makeCathedralChronicle(game);
  assert.deepEqual(story.connections.map(c=>c.title),traceWorld(game.history,CATHEDRAL_WORLD,game.prelude).steps.flatMap(s=>s.reactions.map(r=>r.title)));
  assert.ok(story.connections.some(c=>c.title==='熊公主扶起教宗')&&story.connections.some(c=>c.title==='可以轉送的贖罪'));
  assert.equal(story.title,'《跪完就退位》');assert.match(story.opening,/商會/);
  const lost=makeCathedralChronicle({phase:'defeat',endingReason:'chaos',seed:'L',history:[{stageId:'C02',valid:false,choiceId:null,mark:QUESTION,position:5,punctuated:'聖殿著火了？沒有人知道'}],prelude:[],chaos:7,invalidAttempts:7,riskyCount:0});
  assert.match(lost.epilogue,/聖殿著火了？沒有人知道/);assert.match(lost.title,/退件/);
});
