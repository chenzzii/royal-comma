import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeChronicle, CHRONICLE, CROSSOVERS} from '../src/epilogue.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../content/levels.json',import.meta.url)));
function synthetic(bits,order=data.levels.map((l,i)=>i)) {
  const history=order.map((index)=>{
    const l=data.levels[index],choice=l.choices[(bits>>index)&1];
    return {stageId:l.id,stageTitle:l.title,valid:true,choiceId:choice.id,punctuated:choice.rendered};
  });
  return {phase:'victory',seed:'SAME',history,chaos:3,invalidAttempts:0,riskyCount:4};
}
test('all 16 outcomes have completely written epilogue scenes',()=>{
  for(const level of data.levels)for(const c of level.choices) {
    const sentence=CHRONICLE[level.id]?.[c.id];
    assert.ok(sentence && sentence.length>=35,`${level.id}:${c.id}`);
  }
});
test('256 distinct outcome combinations produce 256 distinct written stories',()=>{
  const stories=new Set();
  for(let bits=0;bits<256;bits++){
    const report=makeChronicle(synthetic(bits));
    const full=[report.title,report.opening,report.acts.map(a=>a.text).join(''),report.connections.map(c=>c.text).join(''),report.epilogue].join('|');
    assert.ok(report.acts.length>=2);
    stories.add(full);
  }
  assert.equal(stories.size,256);
});
test('order of same decisions changes sequence of events',()=>{
  const a=makeChronicle(synthetic(17));
  const b=makeChronicle(synthetic(17,[7,6,5,4,3,2,1,0]));
  assert.notEqual(a.acts[0].text,b.acts[0].text);
});
test('bear princess + demon marriage creates unique crossover',()=>{
  const a=makeChronicle(synthetic((1<<0)|(1<<5)));
  assert.ok(a.connections.some(e=>e.title.includes('熊公主即位')));
  const b=makeChronicle(synthetic((1<<5)));
  assert.ok(b.connections.some(e=>e.title.includes('遲來的營救費')));
});
test('failed run uses real last attempted decree, rejects and length',()=>{
  const state={phase:'defeat',endingReason:'chaos',history:[
    {valid:true,stageId:'L01',stageTitle:'救魔王',choiceId:'B',punctuated:'王子不救，公主救魔王'},
    {valid:false,stageId:'L02',stageTitle:'抓小偷',choiceId:null,position:2,punctuated:'侍衛，不抓王子抓小偷'}
  ],seed:'D',invalidAttempts:5,round:1,chaos:7,riskyCount:1};
  const e=makeChronicle(state);
  assert.match(e.title,/退件/);
  assert.match(e.epilogue,/侍衛，不抓王子抓小偷/);
  assert.match(e.epilogue,/1 道可執行命令/);
});
test('crossover rules refer to existing stages and distinct choices',()=>{
  for(const rule of CROSSOVERS){
    assert.ok(rule.text.length>40);
    for(const id of rule.ids){
      const [stageId, choiceId]=id.split(':');
      assert.ok(data.levels.find(l=>l.id===stageId)?.choices.some(c=>c.id===choiceId));
    }
  }
});
test('cross-stage epilogue respects wedding and rescue chronology',()=>{
  const idx=[5,0,1,2,3,4,6,7];
  const marriedFirst=makeChronicle(synthetic((1<<0)|(1<<5),idx));
  const savedFirst=makeChronicle(synthetic((1<<0)|(1<<5)));
  const find=e=>e.connections.find(x=>x.title.includes('熊公主即位'))?.text;
  assert.match(find(marriedFirst),/新婚丈夫/);
  assert.match(find(savedFirst),/魔界聯姻|兩國簽下永久和平/);
  assert.notEqual(find(marriedFirst),find(savedFirst));
});
