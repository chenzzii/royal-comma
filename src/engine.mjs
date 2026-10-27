/**
 * Project Royal Comma: no missions or revealed solution slots.
 * Higher-chaos *valid* interpretation gives more points, but threatens survival.
 * Invalid punctuation means administrative paralysis, +1 chaos, retry same decree.
 * v4.2: a chapter may allow more than one mark (data.marks, e.g. ['，','？']); each document still has
 * exactly two hidden valid readings. A reading may list `also` placements that say the same thing.
 */
const DEFAULT_RULES = Object.freeze({
  rounds: 8, initialChaos: 0, chaosLoseAt: 7, invalidChaosPenalty: 1,
  pointsRisky: 180, pointsCautious: 65, endBonusPerSafety: 35,
  endBonusPerCorrectDecree: 10,
});
const COMMA = '，', QUESTION = '？', EXCLAIM = '！';
const ALLOWED_MARKS = Object.freeze([COMMA, QUESTION, EXCLAIM]);
function insertMark(raw, position, mark = COMMA) {
  const chars=Array.from(raw);
  if(!Number.isInteger(position)||position<0||position>chars.length)throw new RangeError('Invalid comma position');
  if(!ALLOWED_MARKS.includes(mark))throw new RangeError('Invalid punctuation mark');
  return `${chars.slice(0,position).join('')}${mark}${chars.slice(position).join('')}`;
}
function insertComma(raw, position) { return insertMark(raw, position, COMMA); }
function marksOf(data){return Array.isArray(data?.marks)&&data.marks.length?data.marks:[COMMA];}
function choiceMark(choice){return choice.mark??COMMA;}
/** Every [mark, position] placement that executes this reading (primary first). */
function placementsOf(choice){return [[choiceMark(choice),choice.insertAfter],...(choice.also??[]).map(a=>[a.mark??COMMA,a.insertAfter])];}
function validateGameData(data){
  const rounds=data?.settings?.rounds??DEFAULT_RULES.rounds;
  if(!data || !Array.isArray(data.levels)||data.levels.length!==rounds)throw Error(`${rounds} stages required`);
  const marks=marksOf(data);
  if(!marks.every(m=>ALLOWED_MARKS.includes(m)))throw Error('Unknown punctuation mark');
  const ids=new Set();
  for(const level of data.levels){
    if(ids.has(level.id))throw Error(`Duplicate stage ${level.id}`);ids.add(level.id);
    if(!Array.isArray(level.choices)||level.choices.length!==2)throw Error(`Two outcomes required in ${level.id}`);
    const keys=level.choices.flatMap(c=>placementsOf(c).map(([m,p])=>`${m}@${p}`));
    if(new Set(keys).size!==keys.length)throw Error(`Repeated comma positions in ${level.id}`);
    if(level.choices[0].chaosDelta===level.choices[1].chaosDelta)throw Error(`Chaos must differ for meaningful risk decision in ${level.id}`);
    for(const c of level.choices){
      if(!placementsOf(c).every(([m])=>marks.includes(m)))throw Error(`Mark not allowed in ${level.id}/${c.id}`);
      if(insertMark(level.raw,c.insertAfter,choiceMark(c))!==c.rendered||!Number.isInteger(c.chaosDelta)||!c.meaning||!c.consequence||!c.scene||!c.afterword||!c.headline)throw Error(`Invalid outcome ${level.id}/${c.id}`);
    }
  }
  return true;
}
function hashSeed(seed){let hash=2166136261;for(const c of String(seed)){hash^=c.codePointAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
function createRng(seed){let n=hashSeed(seed)||1;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}
function generateOrder(seed,data){
  const rng=createRng(seed),order=data.levels.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  return order;
}
/** options.prelude: valid history entries from an earlier chapter (story facts only, no score or chaos). */
function newGame(data,seed,options={}){
  validateGameData(data);
  const safe=String(seed||'ROYAL-001').trim().slice(0,42)||'ROYAL-001';
  const settings={...DEFAULT_RULES,...(data.settings??{})};
  const prelude=(options.prelude??[]).filter(h=>h?.valid).map(h=>({stageId:h.stageId,choiceId:h.choiceId,stageTitle:h.stageTitle,valid:true}));
  return {seed:safe,chapter:data.id??'royal',order:generateOrder(data.id&&data.id!=='royal'?`${safe}/${data.id}`:safe,data),settings,round:0,phase:'editing',
    selectedPosition:null,selectedMark:marksOf(data)[0],selectedChoiceId:null,prelude,
    chaos:settings.initialChaos,score:0,riskyCount:0,cautiousCount:0,history:[],invalidAttempts:0,finalBonus:0,endingReason:null};
}
function getCurrentLevel(game,data){return data.levels[game.order[game.round]];}
function findChoice(level,mark,position){return level?.choices.find(c=>placementsOf(c).some(([m,p])=>m===mark&&p===position))||null;}
function currentMark(game){return game.selectedMark??COMMA;}
function getCurrentChoice(game,data){return findChoice(getCurrentLevel(game,data),currentMark(game),game.selectedPosition);}
function selectPosition(game,data,p){
  if(game.phase!=='editing')return game;
  const level=getCurrentLevel(game,data);
  if(!level||!Number.isInteger(p)||p<0||p>Array.from(level.raw).length)return game;
  return {...game,selectedPosition:p,selectedChoiceId:findChoice(level,currentMark(game),p)?.id??null};
}
function selectMark(game,data,mark){
  if(game.phase!=='editing'||!marksOf(data).includes(mark))return game;
  const level=getCurrentLevel(game,data);
  return {...game,selectedMark:mark,selectedChoiceId:game.selectedPosition===null?null:findChoice(level,mark,game.selectedPosition)?.id??null};
}
function selectChoice(game,data,id){
  const c=getCurrentLevel(game,data)?.choices.find(x=>x.id===id);
  if(!c||game.phase!=='editing')return game;
  return selectPosition(selectMark(game,data,choiceMark(c)),data,c.insertAfter);
}
const ROYAL_INVALID_LINES=[
  ['政令變成謎語','大臣讀完聖旨後集體沉默三分鐘，決定先成立「逗號理解委員會」。','朝廷宣布今日不施政，理由是語法仍在討論中。'],
  ['王國停止運轉','左右丞相各自宣稱看懂了句子，但兩人的解讀完全相反。','皇家公務員決定把文件傳給下個單位，最後文件又回到了你的桌上。'],
  ['皇家公文大塞車','國王的句子被切得支離破碎，三個部門收到指令後同時開始蓋章。','最後誰也不敢執行命令，只有影印室超額完成本月績效。'],
  ['政策進入薛丁格狀態','宮廷法律顧問表示：「在沒有更多逗號之前，這份命令既有效又無效。」','戶部為此編列一筆「觀察王國是否存在」的研究預算。'],
];
function invalidHeadline(game,data){
  const lines=data?.invalidLines?.length?data.invalidLines:ROYAL_INVALID_LINES;
  const mark=currentMark(game),markKey=mark===COMMA?'':`/${mark}`;
  return lines[hashSeed(`${game.seed}/${game.round}/${game.selectedPosition}${markKey}`)%lines.length];
}
function judgeChoice(game,data){
  if(game.phase!=='editing'||game.selectedPosition===null)return game;
  const level=getCurrentLevel(game,data),choice=getCurrentChoice(game,data);
  if(!level)return game;
  const mark=currentMark(game);
  const punctuated=insertMark(level.raw,game.selectedPosition,mark);
  if(!choice){
    const [headline,scene,afterword]=invalidHeadline(game,data);
    const nextChaos=Math.max(0,game.chaos+game.settings.invalidChaosPenalty);
    const terminal=nextChaos>=game.settings.chaosLoseAt?'chaos':null;
    const entry={stageId:level.id,stageTitle:level.title,original:level.raw,choiceId:null,position:game.selectedPosition,mark,punctuated,
      meaning:data.invalidMeaning??'標點位置無法形成可執行的政策，官員無從判斷誰該做什麼。',headline,scene,afterword,consequence:`${scene} ${afterword}`,
      chaosDelta:game.settings.invalidChaosPenalty,chaosBefore:game.chaos,chaosAfter:nextChaos,
      valid:false,riskier:null,scoreEarned:0};
    return {...game,phase:'judgment',history:[...game.history,entry],chaos:nextChaos,
      invalidAttempts:game.invalidAttempts+1,endingReason:terminal};
  }
  const alternative=level.choices.find(c=>c.id!==choice.id);
  const riskier=choice.chaosDelta>alternative.chaosDelta;
  const points=riskier?game.settings.pointsRisky:game.settings.pointsCautious;
  const nextChaos=Math.max(0,game.chaos+choice.chaosDelta);
  const terminal=nextChaos>=game.settings.chaosLoseAt?'chaos':game.round===game.settings.rounds-1?'victory':null;
  const entry={stageId:level.id,stageTitle:level.title,original:level.raw,choiceId:choice.id,position:game.selectedPosition,mark,punctuated,
    meaning:choice.meaning,headline:choice.headline,scene:choice.scene,afterword:choice.afterword,consequence:choice.consequence,
    chaosDelta:choice.chaosDelta,chaosBefore:game.chaos,chaosAfter:nextChaos,valid:true,riskier,scoreEarned:points};
  return {...game,phase:'judgment',history:[...game.history,entry],chaos:nextChaos,score:game.score+points,
    riskyCount:game.riskyCount+(riskier?1:0),cautiousCount:game.cautiousCount+(riskier?0:1),endingReason:terminal};
}
function advanceGame(game){
  if(game.phase!=='judgment')return game;
  if(game.endingReason==='victory'){
    const bonus=game.settings.endBonusPerSafety*(game.settings.chaosLoseAt-game.chaos)+game.settings.endBonusPerCorrectDecree*game.settings.rounds;
    return {...game,phase:'victory',score:game.score+bonus,finalBonus:bonus};
  }
  if(game.endingReason)return {...game,phase:'defeat'};
  const last=game.history.at(-1);
  return {...game,round:game.round+(last.valid?1:0),phase:'editing',selectedPosition:null,selectedChoiceId:null};
}
function canSurviveAll(data){
  const limits={...DEFAULT_RULES,...(data.settings??{})};
  let chaos=limits.initialChaos;
  for(const l of data.levels){chaos=Math.max(0,chaos+Math.min(...l.choices.map(c=>c.chaosDelta)));if(chaos>=limits.chaosLoseAt)return false;}
  return true;
}
export {COMMA,QUESTION,EXCLAIM,insertComma,insertMark,marksOf,placementsOf,validateGameData,hashSeed,createRng,generateOrder,newGame,getCurrentLevel,getCurrentChoice,selectPosition,selectMark,selectChoice,judgeChoice,advanceGame,canSurviveAll};
