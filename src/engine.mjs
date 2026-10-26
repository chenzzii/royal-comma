/**
 * Project Royal Comma v3: no missions or revealed solution slots.
 * Higher-chaos *valid* interpretation gives more points, but threatens survival.
 * Invalid punctuation means administrative paralysis, +1 chaos, retry same decree.
 */
const DEFAULT_RULES = Object.freeze({
  rounds: 8, initialChaos: 0, chaosLoseAt: 7, invalidChaosPenalty: 1,
  pointsRisky: 180, pointsCautious: 65, endBonusPerSafety: 35,
  endBonusPerCorrectDecree: 10,
});
function insertComma(raw, position) {
  const chars=Array.from(raw);
  if(!Number.isInteger(position)||position<0||position>chars.length)throw new RangeError('Invalid comma position');
  return `${chars.slice(0,position).join('')}，${chars.slice(position).join('')}`;
}
function validateGameData(data){
  if(!data || !Array.isArray(data.levels)||data.levels.length!==8)throw Error('Eight stages required');
  const ids=new Set();
  for(const level of data.levels){
    if(ids.has(level.id))throw Error(`Duplicate stage ${level.id}`);ids.add(level.id);
    if(!Array.isArray(level.choices)||level.choices.length!==2)throw Error(`Two outcomes required in ${level.id}`);
    if(new Set(level.choices.map(c=>c.insertAfter)).size!==2)throw Error(`Repeated comma positions in ${level.id}`);
    if(level.choices[0].chaosDelta===level.choices[1].chaosDelta)throw Error(`Chaos must differ for meaningful risk decision in ${level.id}`);
    for(const c of level.choices){
      if(insertComma(level.raw,c.insertAfter)!==c.rendered||!Number.isInteger(c.chaosDelta)||!c.meaning||!c.consequence||!c.scene||!c.afterword||!c.headline)throw Error(`Invalid outcome ${level.id}/${c.id}`);
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
function newGame(data,seed){
  validateGameData(data);
  const safe=String(seed||'ROYAL-001').trim().slice(0,42)||'ROYAL-001';
  const settings={...DEFAULT_RULES,...(data.settings??{})};
  return {seed:safe,order:generateOrder(safe,data),settings,round:0,phase:'editing',selectedPosition:null,selectedChoiceId:null,
    chaos:settings.initialChaos,score:0,riskyCount:0,cautiousCount:0,history:[],invalidAttempts:0,finalBonus:0,endingReason:null};
}
function getCurrentLevel(game,data){return data.levels[game.order[game.round]];}
function getCurrentChoice(game,data){return getCurrentLevel(game,data)?.choices.find(c=>c.insertAfter===game.selectedPosition)||null;}
function selectPosition(game,data,p){
  if(game.phase!=='editing')return game;
  const level=getCurrentLevel(game,data);
  if(!level||!Number.isInteger(p)||p<0||p>Array.from(level.raw).length)return game;
  return {...game,selectedPosition:p,selectedChoiceId:level.choices.find(c=>c.insertAfter===p)?.id??null};
}
function selectChoice(game,data,id){const p=getCurrentLevel(game,data)?.choices.find(c=>c.id===id)?.insertAfter;return p===undefined?game:selectPosition(game,data,p);}
function invalidHeadline(game){
  const lines=[
    ['政令變成謎語','大臣讀完聖旨後集體沉默三分鐘，決定先成立「逗號理解委員會」。','朝廷宣布今日不施政，理由是語法仍在討論中。'],
    ['王國停止運轉','左右丞相各自宣稱看懂了句子，但兩人的解讀完全相反。','皇家公務員決定把文件傳給下個單位，最後文件又回到了你的桌上。'],
    ['皇家公文大塞車','國王的句子被切得支離破碎，三個部門收到指令後同時開始蓋章。','最後誰也不敢執行命令，只有影印室超額完成本月績效。'],
    ['政策進入薛丁格狀態','宮廷法律顧問表示：「在沒有更多逗號之前，這份命令既有效又無效。」','戶部為此編列一筆「觀察王國是否存在」的研究預算。'],
  ];return lines[hashSeed(`${game.seed}/${game.round}/${game.selectedPosition}`)%lines.length];
}
function judgeChoice(game,data){
  if(game.phase!=='editing'||game.selectedPosition===null)return game;
  const level=getCurrentLevel(game,data),choice=getCurrentChoice(game,data);
  if(!level)return game;
  const punctuated=insertComma(level.raw,game.selectedPosition);
  if(!choice){
    const [headline,scene,afterword]=invalidHeadline(game);
    const nextChaos=Math.max(0,game.chaos+game.settings.invalidChaosPenalty);
    const terminal=nextChaos>=game.settings.chaosLoseAt?'chaos':null;
    const entry={stageId:level.id,stageTitle:level.title,original:level.raw,choiceId:null,position:game.selectedPosition,punctuated,
      meaning:'標點位置無法形成可執行的政策，官員無從判斷誰該做什麼。',headline,scene,afterword,consequence:`${scene} ${afterword}`,
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
  const entry={stageId:level.id,stageTitle:level.title,original:level.raw,choiceId:choice.id,position:game.selectedPosition,punctuated,
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
export {insertComma,validateGameData,hashSeed,createRng,generateOrder,newGame,getCurrentLevel,getCurrentChoice,selectPosition,selectChoice,judgeChoice,advanceGame,canSurviveAll};
