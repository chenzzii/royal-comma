import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  insertComma,validateGameData,newGame,selectChoice,selectPosition,judgeChoice,
  advanceGame,generateOrder,getCurrentLevel,canSurviveAll
} from '../src/engine.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../content/levels.json',import.meta.url)));
const pick=(g,c)=>selectChoice(g,data,c.id);
const high=l=>l.choices.reduce((a,b)=>a.chaosDelta>b.chaosDelta?a:b);
const low=l=>l.choices.reduce((a,b)=>a.chaosDelta<b.chaosDelta?a:b);

test('eight complete stages, exactly two distinct hidden outcomes, no missions',()=>{
  assert.equal(validateGameData(data),true);
  for(const level of data.levels){
    assert.equal('missions' in level,false);
    assert.notEqual(level.choices[0].chaosDelta,level.choices[1].chaosDelta);
    for(const c of level.choices){
      const rendered=insertComma(level.raw,c.insertAfter);
      assert.equal(rendered,c.rendered);
      assert.equal(rendered.replace('，',''),level.raw);
      assert.equal((rendered.match(/，/g)||[]).length,1);
    }
  }
  assert.throws(()=>insertComma('聖旨',-1),RangeError);
});

test('seed produces same shuffled order and differs for other seed',()=>{
  assert.deepEqual(generateOrder('X',data),generateOrder('X',data));
  assert.deepEqual(generateOrder('Y',data),generateOrder('Y',data));
  assert.notDeepEqual(generateOrder('Y',data),generateOrder('X',data));
  assert.deepEqual([...generateOrder('X',data)].sort(),[0,1,2,3,4,5,6,7]);
});

test('any comma boundary allowed; invalid punctuation reattempts same stage and +1 chaos',()=>{
  const g=newGame(data,'INVALID-SLOTS'),level=getCurrentLevel(g,data),valid=new Set(level.choices.map(c=>c.insertAfter));
  for(let p=0;p<=Array.from(level.raw).length;p++){
    const selected=selectPosition(g,data,p),judged=judgeChoice(selected,data);
    assert.equal(selected.selectedPosition,p);
    assert.equal(judged.history.length,1);
    if(valid.has(p))assert.equal(judged.history[0].valid,true);
    else {
      assert.equal(judged.history[0].valid,false);
      assert.equal(judged.chaos,1);
      assert.equal(judged.score,0);
      const retry=advanceGame(judged);
      assert.equal(retry.round,0);
      assert.equal(retry.phase,'editing');
      assert.equal(retry.selectedPosition,null);
    }
  }
  assert.equal(insertComma(level.raw,0).startsWith('，'),true);
  assert.equal(insertComma(level.raw,Array.from(level.raw).length).endsWith('，'),true);
});

test('risky branch yields 180, cautious branch 65 with different chaos deltas',()=>{
  const g=newGame(data,'SCORE'),l=getCurrentLevel(g,data);
  const risk=judgeChoice(pick(g,high(l)),data);
  const cautious=judgeChoice(pick(g,low(l)),data);
  assert.equal(risk.score,180);assert.equal(risk.riskyCount,1);assert.equal(risk.cautiousCount,0);
  assert.equal(risk.history[0].riskier,true);
  assert.equal(cautious.score,65);assert.equal(cautious.cautiousCount,1);
  assert.equal(cautious.history[0].riskier,false);
  assert.equal(risk.chaos,Math.max(0,high(l).chaosDelta));
  assert.equal(cautious.chaos,Math.max(0,low(l).chaosDelta));
});

test('cannot submit without selection and cannot double-submit',()=>{
  const g=newGame(data,'NO-DOUBLE');assert.equal(judgeChoice(g,data),g);
  const next=judgeChoice(pick(g,high(getCurrentLevel(g,data))),data);
  assert.equal(judgeChoice(next,data),next);
  assert.equal(next.history.length,1);
  assert.equal(next.score,180);
  assert.equal(selectChoice(next,data,high(getCurrentLevel(g,data)).id),next);
});

test('seven invalid commas crash kingdom with no valid stage advance',()=>{
  let g=newGame(data,'SEVEN-INVALID');
  for(let i=0;i<7;i++){
    g=judgeChoice(selectPosition(g,data,0),data);
    assert.equal(g.chaos,i+1);
    assert.equal(g.round,0);
    if(i<6)g=advanceGame(g);
  }
  assert.equal(g.endingReason,'chaos');
  assert.equal(advanceGame(g).phase,'defeat');
});

test('choosing safer branch makes full 8-stage victory possible for all seed orders',()=>{
  assert.equal(canSurviveAll(data),true);
  for(const seed of ['A','B','C','ROYAL-001','DAILY-2026-10-26']){
    let g=newGame(data,seed);
    for(let i=0;i<8;i++){
      g=judgeChoice(pick(g,low(getCurrentLevel(g,data))),data);
      assert.equal(g.phase,'judgment');
      if(i<7){g=advanceGame(g);assert.equal(g.phase,'editing');}
    }
    assert.equal(g.endingReason,'victory');
    const complete=advanceGame(g);
    assert.equal(complete.phase,'victory');
    assert.equal(complete.score,8*65+complete.finalBonus);
    assert.ok(complete.finalBonus>0);
    assert.equal(advanceGame(complete),complete);
  }
});

test('bad high-chaos choices can cause defeat even without invalid punctuation',()=>{
  let g=newGame(data,'HIGH-RISK');
  for(let i=0;i<8;i++){
    const l=getCurrentLevel(g,data);
    g=judgeChoice(pick(g,high(l)),data);
    if(g.endingReason)break;
    g=advanceGame(g);
  }
  assert.equal(g.endingReason,'chaos');
  assert.equal(advanceGame(g).phase,'defeat');
});

test('bear princess story preserved and sound-related UI is independent of mission',()=>{
  let g=newGame(data,'BEAR');g={...g,round:g.order.indexOf(0)};
  // v4.1: hidden slots differ per decree, so use the authored position instead of a fixed index.
  const bear=data.levels[0].choices.find(c=>c.id==='B');
  g=judgeChoice(selectPosition(g,data,bear.insertAfter),data);
  assert.equal(g.history.at(-1).headline,'熊公主橫空出世');
  assert.match(g.history.at(-1).scene,/馬匹情緒不佳/);
});

// Branching ending tests are in epilogue.test.mjs.
