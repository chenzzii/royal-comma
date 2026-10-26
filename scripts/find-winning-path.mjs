import fs from 'node:fs';
import {newGame,getCurrentLevel,selectChoice,judgeChoice,advanceGame} from '../src/engine.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../content/levels.json',import.meta.url)));
const seed=process.argv[2]||'TEST-VICTORY';
const plan = game => {
 if(game.phase==='victory')return {score:game.score,moves:[]};
 if(game.phase==='defeat')return null;
 const level=getCurrentLevel(game,data);
 let best=null;
 for(const c of level.choices){
  const judged=judgeChoice(selectChoice(game,data,c.id),data);
  const next=advanceGame(judged);
  const result=plan(next);
  if(result && (!best || result.score>best.score))best={score:result.score,moves:[{level:level.id,choice:c.id,delta:c.chaosDelta},...result.moves]};
 }
 return best;
};
const result=plan(newGame(data,seed));
if(!result)throw Error('No winning strategy');
console.log(JSON.stringify({seed,...result},null,2));
