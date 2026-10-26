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
const CROSSOVERS = [
  {
    ids:['L01:B','L06:B'],
    title:'熊公主即位（魔界聯姻特別篇）',
    text:'熊公主不只徒手救出魔王，還決定跟魔王結婚。婚宴時魔王緊張到站不穩，她一手扶住新郎、一手托起倒塌的宮殿。兩國簽下永久和平協議；王子因為「逃避救援」被禁止參加家庭聚餐。'
  },
  {
    ids:['L01:A','L06:B'],
    title:'遲來的營救費',
    text:'當年被王子留在塔上的公主轉頭嫁給魔王，婚禮上把「營救費用請款單」交給王子。王子主張自己救過魔王應折抵費用，魔王回覆：「我們現在是夫妻，你找我太太談。」'
  },
  {
    ids:['L01:B','L06:A'],
    title:'勇者與熊公主的同學會',
    text:'勇者娶了魔王，熊公主成為婚宴最受歡迎的女賓客。她只用兩根手指搬動宴會長桌，勇者突然明白：當初拯救世界的人可能一直不是自己。'
  },
  {
    ids:['L03:B','L07:B'],
    title:'皇家多角化經營',
    text:'國王白天餵巨龍、晚上直播賣魔藥。巨龍被指定為官方試用員，喝完魔藥後打嗝噴火，燒掉整批存貨。國王對外宣稱這叫「零庫存經營」。'
  },
  {
    ids:['L04:A','L06:B'],
    title:'神殿的婚姻認證',
    text:'原本支持魔王的祭司，終於等到魔王成為王室女婿。他立即宣布此為神蹟，卻忘了去年才寫過「王室不可相信」的論文；神殿現在把那篇論文列為機密。'
  },
  {
    ids:['L04:A','L06:A'],
    title:'神殿喜獲一位新主管',
    text:'祭司既然信任魔王，就理所當然出席魔王與勇者的婚禮，並在台上宣告終身效忠。隔天他的職稱變成「魔界教務長」，待遇只有無限供應的婚禮喜糖。'
  },
  {
    ids:['L02:B','L05:B'],
    title:'王子的全能履歷',
    text:'王子不但替侍衛追小偷，後來還親自處罰國王。他將兩次事蹟寫成履歷，自稱「執法、司法、孝親三棲人才」。國王看完只問了一句：「你能先出去工作嗎？」'
  },
  {
    ids:['L05:A','L08:A'],
    title:'最高權力與最低餘額',
    text:'國王前腳被大臣罰款，後腳又把整箱金幣送給公主。財政官宣布國庫帳目完全平衡，因為他已經把「罰款」和「送禮」都列為精神資產。'
  },
  {
    ids:['L07:B','L08:B'],
    title:'太子救市計畫',
    text:'國王直播賣藥失利，轉頭宣布王子必須自掏腰包。王子從此成為皇室唯一有收入的人，薪水卻一分不剩。王國發現自己開創了最新型的「皇室親子訂閱制」。'
  },
  {
    ids:['L01:B','L08:A'],
    title:'公主的新國策',
    text:'熊公主用繼承的金幣成立免費健身房，並在門口掛出標語：「救國不用等王子。」國民體能提升，王子則請病假三個月，理由是看到啞鈴會頭暈。'
  },
  {
    ids:['L03:A','L07:A'],
    title:'餐飲衛生聯合稽查',
    text:'巨龍對御膳讚不絕口，偏偏巫師開始販售打嗝藥。兩項產業合作推出「吃飽必打嗝」套餐，衛生部要求標示副作用，廣告部則堅持這就是賣點。'
  },
  {
    ids:['L02:A','L08:B'],
    title:'沒人肯付的警察加班費',
    text:'侍衛抓到小偷後申請加班費，財政部卻表示既然王子可以自己拿錢給公主，也應由王子負擔警備預算。王子最後宣布自己要去當小偷，至少還有機會拿回一點。'
  }
];
const INTROS = [
  '國王明明已經駕崩，人事系統卻說他沒有完成離職程序，因此仍須照常上班。王國起初只有一個麻煩：國王留下的句子沒有逗號。後來史官才發現，這其實是那一年最不重要的麻煩。',
  '皇家文書局只負責標點，不負責理解。國王駕崩後還被排進下週值班表，這項看似謹慎的職務分工，開啟了王國最忙碌的一年。',
  '史書稱那一年為「逗號之亂」。國王已駕崩卻仍不得休假，名字聽起來不大，實際上動用了王國所有的律師、侍衛和善後委員會。'
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
  const orderIndex=id=>entries.findIndex(e=>e.id===id);
  const connections=CROSSOVERS.filter(x=>x.ids.every(id=>seen.has(id))).map(c=>{
    const reordered=c.ids.length===2 && orderIndex(c.ids[0])>orderIndex(c.ids[1]);
    if(!reordered)return c;
    if(c.ids[0]==='L01:B' && c.ids[1]==='L06:B')return {...c,text:'公主先與魔王成婚，沒想到新婚丈夫隨後就被困在魔塔。王子立刻請了病假，公主只能徒手扛起整座塔救夫，練成「熊公主」。魔王婚後第一次接受訪問時表示：「我以為我娶的是公主，原來娶的是救難隊。」'};
    if(c.ids[0]==='L01:A' && c.ids[1]==='L06:B')return {...c,text:'公主已經和魔王舉行婚禮，王子卻在婚後才衝去營救魔王。他堅持自己是和平使者，公主回覆：「謝謝你救我丈夫，晚餐不必來了。」王子只拿到一張過期的伴郎邀請函。'};
    if(c.ids[0]==='L01:B' && c.ids[1]==='L06:A')return {...c,text:'勇者與魔王先辦完婚禮，沒想到魔王又被關入高塔。王子藉口裝備送洗，公主親自把魔王救出來，正式成為熊公主。勇者看著獲救的新婚伴侶，決定把傳說之劍改造成健身器材。'};
    return c;
  });
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
    const social=seen.has('L01:B')?'熊公主現在可以徒手搬開任何擋路的宮門。':'公主仍在研究一套能讓王子認真工作的制度。';
    const economic=seen.has('L07:B')?'財政部將國王的直播帶貨列為國家級災害。':'財政部宣告今年最大的成就，是終於不用替國王處理直播退款。';
    epilogue=`八份聖旨終於全部蓋章。最後傳出的公告是「${lastValid?.punctuated??'公文辦結'}」，而王國居然還保有 ${7-game.chaos} 點距離滅亡的安全空間。${social}${economic} 後人研究你的 ${high} 次高風險解讀與 ${detours} 次退件後，決定將你升任「首席逗號風險顧問」，年薪照舊，責任加倍。`;
  }
  return {title,opening,acts,connections:connections.slice(0,4).map(({title,text})=>({title,text})),epilogue,
    signature:history.map(h=>`${h.stageId}:${h.choiceId??`X${h.position}`}`).join('|')};
}
export {makeChronicle, CHRONICLE, CROSSOVERS};
