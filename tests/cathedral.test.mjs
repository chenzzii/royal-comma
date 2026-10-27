import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COMMA,QUESTION,EXCLAIM,validateGameData,canSurviveAll,newGame,getCurrentLevel,selectMark,selectChoice,judgeChoice,advanceGame,generateOrder,readingAlternatives,togglePlacement,marksPerDoc} from '../src/engine.mjs';
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
const place=(g,pairs,data=cath)=>pairs.reduce((x,[m,p])=>togglePlacement(selectMark(x,data,m),data,p),g);
const play=(g,pairs)=>judgeChoice(place(g,pairs),cath);
const ORDERS=Array.from({length:30},(_,i)=>generateOrder(`C-${i}/cathedral`,cath));
const combo=(bits,order)=>order.map(i=>`${cath.levels[i].id}:${cath.levels[i].choices[(bits>>i)&1].id}`);
const PRELUDES=[[],['L01:B','L05:B','L04:A','L07:B'],['G02:B','G06:B','G01:B','G05:A'],
  ['L01:B','L04:A','L05:B','L07:B','G01:B','G02:B','G05:A','G06:B'],['L01:A','L08:B','G03:B','G04:A']];

test('chapter 3 data: six notices, exactly three marks each, exclamation matters, survivable',()=>{
  assert.equal(validateGameData(cath),true);
  assert.equal(cath.levels.length,6);
  assert.equal(marksPerDoc(cath),3);
  assert.deepEqual(cath.marks,[COMMA,QUESTION,EXCLAIM]);
  assert.equal(canSurviveAll(cath),true);
  for(const l of cath.levels)for(const c of l.choices)for(const alt of readingAlternatives(c))assert.equal(alt.length,3,`${l.id}/${c.id}`);
  assert.ok(cath.levels.filter(l=>l.choices.some(c=>c.rendered.includes(EXCLAIM))).length>=5,'exclamation should appear in most notices');
  assert.ok(cath.levels.some(l=>{const [a,b]=l.choices;return a.placements.some((p,i)=>p.at===b.placements[i]?.at&&!(p.accept??[p.mark]).includes(b.placements[i].mark)&&[p.mark,b.placements[i].mark].includes(EXCLAIM));}),'need a slot where ！ vs another mark decides the reading');
  // How many marks really decide between the readings (slot differs, or the accepted marks do not overlap).
  const deciding=l=>{const [a,b]=l.choices.map(c=>c.placements);return a.filter(p=>{const q=b.find(x=>x.at===p.at);return !q||!(p.accept??[p.mark]).some(m=>(q.accept??[q.mark]).includes(m));}).length;};
  assert.ok(cath.levels.every(l=>deciding(l)>=1));
  assert.ok(cath.levels.some(l=>deciding(l)>=2),'at least one notice hinges on two marks at once');
  for(const l of cath.levels)assert.ok(!royal.levels.some(r=>r.raw===l.raw)&&!guild.levels.some(g=>g.raw===l.raw));
});

test('three marks: ！ vs ， at the same slot decides; every alternative round-trips; earlier chapters unaffected',()=>{
  const fire=at(newGame(cath,'FIRE'),'C02');
  assert.equal(play(fire,[[COMMA,3],[COMMA,8],[QUESTION,14]]).history[0].choiceId,'A');
  assert.equal(play(fire,[[COMMA,3],[EXCLAIM,8],[QUESTION,14]]).history[0].choiceId,'B');
  assert.equal(play(fire,[[COMMA,3],[EXCLAIM,8],[EXCLAIM,14]]).history[0].valid,false);
  const two=place(fire,[[COMMA,3],[COMMA,8]]);assert.equal(judgeChoice(two,cath),two,'needs all three');
  const full=place(fire,[[COMMA,3],[COMMA,8],[QUESTION,14]]);assert.equal(togglePlacement(full,cath,1),full,'no fourth mark');
  for(const l of cath.levels)for(const c of l.choices)for(const alt of readingAlternatives(c))for(const pick of [0,-1]){
    const pairs=alt.map(a=>[a.accept.at(pick),a.at]);
    assert.equal(play(at(newGame(cath,'RT'),l.id),pairs).history[0].choiceId,c.id,`${l.id} ${JSON.stringify(pairs)}`);
  }
  const r=newGame(royal,'R'),g=newGame(guild,'G');
  assert.equal(selectMark(r,royal,EXCLAIM),r);assert.equal(selectMark(g,guild,EXCLAIM),g);
  assert.equal(marksPerDoc(royal),1);
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
  const lost=makeCathedralChronicle({phase:'defeat',endingReason:'chaos',seed:'L',history:[{stageId:'C02',valid:false,choiceId:null,placements:[],punctuated:'修女說？聖殿著火了，沒有人知道吧？'}],prelude:[],chaos:7,invalidAttempts:7,riskyCount:0});
  assert.match(lost.epilogue,/修女說？聖殿著火了，沒有人知道吧？/);assert.match(lost.title,/退件/);
});
