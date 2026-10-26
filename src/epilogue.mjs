import {CHAINS,traceWorld} from './world.mjs';
/**
 * Branching royal chronicle. Every validated decree has an authored aftermath;
 * consequences collide through hand-written crossover scenes and a dynamic finale.
 * Never call AI / network. Identical histories produce identical stories.
 */
const CHRONICLE = {
  L01: {
    A: '王子公開宣布「救魔王比救公主更具外交效益」，隨即領走和平勳章。公主留在高塔，從此每天對王宮寄送一張列有利息的營救費用請款單。',
    B: '王子連寫三張請假單，公主只好自己扛起魔塔大門。她救出魔王後練成一身肌肉，「熊公主」成為民間傳唱的名字；王子則被任命為全國示範性膽小鬼。'
  },
  L02: {
    A: '侍衛抓到了小偷，王子卻把自己修進所有的功勞照片。皇家史館因此成立了修圖審核組，第一份成果是把王子從照片裡修掉。',
    B: '侍衛全體宣布自己只負責監督，王子親自追捕小偷，跑到鞋底冒煙。最終被抓的人是小偷，收到績效獎金的人卻是侍衛隊。'
  },
  L03: {
    A: '御廚將國王的晚餐端給巨龍，換來龍族一封感謝函。國王吃著乾麵包閱讀函文，突然理解為什麼臣民總說「民以食為天」。',
    B: '國王親自餵龍後，巨龍只認御用服務員。陛下從此每天早中晚三次報到，王宮門口掛起招牌：「本國最高領導人目前在餵食中」。'
  },
  L04: {
    A: '祭司公開宣稱魔王比王室可信，神殿立即改掛「誠信魔界」的招牌。兩派學者寫了七百頁論文，研究為何相信魔王反而能讓信徒安心。',
    B: '國王把國庫的一袋金幣當成誠信保證金匯給魔王。神殿安排他上防詐課，課程最後考試只有一題：「下次還匯不匯？」陛下選了「再看看」。'
  },
  L05: {
    A: '大臣依法律開罰國王，國王大怒要求追究立法責任。查到最後發現法律由國王親筆簽署，於是再補上一張「妨礙自己執法」罰單。',
    B: '王子宣布對父王處以公開反省，還特別訂製一頂紙製囚帽。國王含淚稱讚孩子長大了，下一句則是詢問能否依法取消親子關係。'
  },
  L06: {
    A: '勇者與魔王辦了一場盛大婚禮，屠龍劍改作切蛋糕工具。原來的宿敵們終於不用打仗，卻因賓客座位表引發三次外交危機。',
    B: '公主宣布與魔王成婚，勇者改穿盔甲站在婚宴門口查驗喜帖。王國史官認真寫下：「世界得到和平，勇者得到保全工作。」'
  },
  L07: {
    A: '巫師堅持不販售國王本人，只販售會讓人打嗝的魔藥。皇家人權委員會第一次準時下班，因為今天終於沒有皇室人口販賣爭議。',
    B: '國王開直播賣魔藥，喊出「朕親自喝過」後鬍子當場爆炸。商品評價一夕跌到一星，王室隨即宣布「不給五星就是叛國」。'
  },
  L08: {
    A: '國王把金幣交給公主，王子只得到一張「感謝參與」的卷軸。公主捐款蓋了一座圖書館，王子成立了只有自己一人的遺產追討委員會。',
    B: '國王分文未出，命王子拿私房錢給公主。王子把最後一枚金幣交出去時，國王笑著宣布：明年的國家預算也改由太子贊助。'
  }
};
/* v4.1: cross-stage stories come from the same causal trace the judgment screen uses
 * (src/world.mjs), so the chronicle can never claim an order that did not happen.
 * Compatibility view: ids lists every decree involved, the triggering decree last. */
const CROSSOVERS = CHAINS.map(c=>({id:c.id,ids:[...c.after,c.on],title:c.title,text:c.chronicle}));
const INTROS = [
  '國王身體硬朗，卻在某個無聊的午後預立了遺囑。宮廷法典規定遺囑必須「生前試行」，以免死後出錯，於是陛下得親自配合執行。王國起初只有一個麻煩：遺囑的句子沒有逗號。後來史官才發現，這其實是那一年最不重要的麻煩。',
  '皇家文書局只負責標點，不負責理解。國王堅持「遺囑要趁朕還活著先試辦一次」，這項看似謹慎的行政程序，開啟了王國最忙碌的一年。',
  '史書稱那一年為「逗號之亂」。起因是國王想確認自己的遺囑能不能正常運作，名字聽起來不大，實際上動用了王國所有的律師、侍衛和善後委員會。'
];
function chooseVariant(seed, count){
  let h=0;for(const c of `${seed}:${count}`) h=((h<<5)-h+c.charCodeAt(0))|0;
  return Math.abs(h)%INTROS.length;
}
function makeChronicle(game){
  const history=game?.history ?? [];
  const valid=history.filter(h=>h.valid && CHRONICLE[h.stageId]?.[h.choiceId]);
  const entries=valid.map(h=>({id:`${h.stageId}:${h.choiceId}`,text:CHRONICLE[h.stageId][h.choiceId],stage:h.stageTitle}));
  const seen=new Set(entries.map(x=>x.id));
  const world=traceWorld(history);
  // Every chain that actually fired, in the order it happened; no cap, no duplicates.
  const connections=world.steps.flatMap(st=>st.reactions).map(c=>({title:c.title,text:c.chronicle}));
  const doomed=game?.phase==='defeat'||game?.endingReason==='chaos';
  const title = doomed
    ? game.invalidAttempts>=4 ? '《文書局把王國退件了》' : game.riskyCount>=3 ? '《八個逗號還沒寫完，王國先寫完了》' : '《史上最短命的行政改革》'
    : seen.has('L01:B')&&seen.has('L06:B') ? '《熊公主與魔王的肌肉和平條約》'
    : seen.has('L03:B')&&seen.has('L07:B') ? '《國王的副業終於比王國還大》'
    : seen.has('L05:A')&&seen.has('L08:A') ? '《國王有權，但沒有錢》'
    : game.chaos>=5 ? '《一個還沒倒閉的荒謬國家》'
    : game.riskyCount>=3 ? '《把國家玩到極限的書記官》'
    : '《王國居然還在營業》';
  const opening=INTROS[chooseVariant(game.seed,entries.length)];
  const acts=[];
  const chapterTitles=['第一幕：公文開始具有生命','第二幕：朝廷發現問題比答案多','第三幕：國家終於要簽收後果'];
  for(let j=0;j<3;j++){
    const subset=entries.slice(j*3,j*3+3);
    if(!subset.length)continue;
    const text=subset.map(e=>e.text).join(' ');
    acts.push({title:chapterTitles[j],text});
  }
  const detours=history.filter(x=>!x.valid).length;
  const last=history.at(-1);
  let epilogue;
  if(doomed){
    const why=last?.valid
      ? `最後一份被執行的命令是「${last.punctuated}」。各部門還沒決定該先追究誰，王國就已經正式停止營業。`
      : `最後一張公文寫成「${last?.punctuated??'（內容已遺失）'}」。官員表示看不懂，皇家印章卻已經蓋下去，於是所有部門一致同意先宣布王國不存在。`;
    epilogue=`${why} 史官最後記錄：書記官完成了 ${valid.length} 道可執行命令，製造 ${detours} 次退件，皇家混亂達到 ${game.chaos}。王國消失後，唯一照常上班的是文書局，因為他們正在開會討論應該用哪一種標點宣告破產。`;
  }else{
    const high=game.riskyCount;
    const lastValid=valid.at(-1);
    const f=world.facts;
    const social=f.bearPrincess?'熊公主現在可以徒手搬開任何擋路的宮門。'
      :f.princess==='tower'?'公主仍住在塔上，透過吊籃處理國事，效率比朝廷還高。'
      :'公主仍在研究一套能讓王子認真工作的制度。';
    const economic=seen.has('L07:B')?'財政部將國王的直播帶貨列為國家級災害。':'財政部宣告今年最大的成就，是終於不用替國王處理直播退款。';
    epilogue=`八份聖旨終於全部蓋章。最後傳出的公告是「${lastValid?.punctuated??'公文辦結'}」，而王國居然還保有 ${7-game.chaos} 點距離滅亡的安全空間。${social}${economic} 後人研究你的 ${high} 次高風險解讀與 ${detours} 次退件後，決定將你升任「首席逗號風險顧問」，年薪照舊，責任加倍。`;
  }
  return {title,opening,acts,connections,epilogue,
    signature:history.map(h=>`${h.stageId}:${h.choiceId??`X${h.position}`}`).join('|')};
}
export {makeChronicle, CHRONICLE, CROSSOVERS};
