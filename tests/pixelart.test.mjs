import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sceneSvg,SCENE_KEYS,ART_W,ART_H} from '../src/pixelart.mjs';
const load=f=>JSON.parse(fs.readFileSync(new URL(`../content/${f}.json`,import.meta.url)));
const royal=load('levels'),guild=load('guild'),cathedral=load('cathedral');

test('every outcome in all three chapters has its own 8-bit illustration', ()=>{
  const keys=[...royal.levels,...guild.levels,...cathedral.levels].flatMap(l=>l.choices.map(c=>`${l.id}:${c.id}`));
  assert.deepEqual([...SCENE_KEYS].sort(),[...keys].sort());
  const seen=new Set();
  for(const k of keys){
    const svg=sceneSvg(...k.split(':'),'標題');
    assert.match(svg,new RegExp(`^<svg class="pixel-scene" viewBox="0 0 ${ART_W} ${ART_H}"`));
    assert.ok(!/undefined|null|NaN/.test(svg),k);
    const fills=[...svg.matchAll(/fill="([^"]+)"/g)].map(m=>m[1]);
    assert.ok(fills.length>200&&fills.every(f=>/^#[0-9a-f]{6}$/i.test(f)),k);
    assert.equal(svg,sceneSvg(...k.split(':'),'標題'),'deterministic');
    assert.ok(!seen.has(svg),`${k} duplicates another scene`);seen.add(svg);
    assert.ok(svg.length<200000,`${k} too large`);
  }
});

test('unknown outcomes have no illustration; labels are escaped', ()=>{
  assert.equal(sceneSvg('G09','A'),'');
  assert.equal(sceneSvg('L01','Z'),'');
  assert.ok(!sceneSvg('L01','A','<b>"x"</b>').includes('<b>'));
});
