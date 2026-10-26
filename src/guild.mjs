/**
 * Chapter 2 — 金幣商會. Same causal design as chapter 1 (src/world.mjs) and reuses its trace:
 * the chapter-1 history (if the player continued from it) is the prelude, so its facts and
 * decisions can trigger guild chains. Story only: nothing here changes chaos or score.
 */
import {traceWorld} from './world.mjs';
const GUILD_INITIAL = Object.freeze({
  presidentRetiring:false, presidentRefuses:false, giftBan:false, giftsLegal:false,
  princeDebtForgiven:false, princeWorksAtGuild:false, presidentSelfAudit:false, accountantPunished:false,
  guildSoldAssets:false, vaultIOUs:false, honestySign:false, ironicSign:false,
});
const GUILD_EFFECTS = {
  'G01:A': f=>({...f, presidentRetiring:true}),
  'G01:B': f=>({...f, presidentRefuses:true}),
  'G02:A': f=>({...f, giftBan:true}),
  'G02:B': f=>({...f, giftsLegal:true}),
  'G03:A': f=>({...f, princeDebtForgiven:true}),
  'G03:B': f=>({...f, princeWorksAtGuild:true}),
  'G04:A': f=>({...f, presidentSelfAudit:true}),
  'G04:B': f=>({...f, accountantPunished:true}),
  'G05:A': f=>({...f, guildSoldAssets:true}),
  'G05:B': f=>({...f, vaultIOUs:true}),
  'G06:A': f=>({...f, honestySign:true}),
  'G06:B': f=>({...f, ironicSign:true}),
};
const GUILD_CHAINS = [
  // 收禮 × 王子欠條
  {id:'gift-for-debt',on:'G03:A',after:['G02:B'],title:'一張簽名照的價值',
    judgment:'章程剛宣布收禮合法，王子就送了會長一份禮物——一張親筆簽名照。會長收下照片，當場撕了欠條。股東們這才明白收禮條款的真正用途。',
    chronicle:'收禮合法化之後，王子用一張簽名照換掉了整筆欠款。史學家認為，這是金幣商會史上匯率最好的一筆交易。'},
  {id:'debt-then-gifts',on:'G02:B',after:['G03:A'],title:'事後補登的禮物',
    judgment:'王子的欠款剛被勾銷，章程就宣布收禮合法。股東立刻調查勾銷前一天王子送了什麼，結果是一頂紙做的王冠，會長堅稱那是「無價之寶」。',
    chronicle:'會長先撕了王子的欠條，後來才讓收禮合法化。股東們追查之下，發現那頂紙王冠被登記成公會最貴的資產。'},
  // 退休風波 × 反諷招牌
  {id:'liar-wont-retire',on:'G01:B',after:['G06:B'],title:'全城都不信他在查',
    judgment:'全城都知道會長說謊，所以當他宣布「暫緩退休，直到查出是誰反對」時，沒有人相信他真的在查。反對派乾脆在反諷招牌旁邊又掛了一塊：「退休了沒？」',
    chronicle:'反諷招牌先讓全城看穿了會長，後來他拒絕退休時，反對派把催退公告直接掛在招牌旁邊，兩塊牌子並列成觀光景點。'},
  {id:'sign-conspiracy',on:'G06:B',after:['G01:B'],title:'招牌與公告聯合調查小組',
    judgment:'會長還在揪出反對他退休的人，大門又掛上了反諷招牌。他認定兩件事是同一夥人做的，成立「招牌與公告聯合調查小組」，組長是他自己。',
    chronicle:'會長先拒絕退休，接著大門出現反諷招牌。他成立聯合調查小組自己查自己，結案報告只有一句：「仍在調查中。」'},
  // 查帳 × 金庫
  {id:'same-name-ious',on:'G05:B',after:['G04:A'],title:'借據上的熟悉字跡',
    judgment:'會長上週才查帳查到自己，這週股東打開金庫，看到一疊借據——借款人欄寫的全是同一個名字。會長說：「至少帳目一致。」',
    chronicle:'會長先在稽查中查到自己，後來股東打開金庫，發現每張借據都是會長本人簽的。公會因此被評為「帳目最一致的商會」。'},
  {id:'magnifier-mirror',on:'G04:A',after:['G05:B'],title:'放大鏡與鏡子',
    judgment:'金庫只剩借據的消息傳開後，會長親自查帳，想找出是誰借走了錢。他查到最後，把放大鏡慢慢轉向牆上的鏡子。',
    chronicle:'股東先在金庫裡找到一疊借據，會長才親自查帳。他最後的調查方向是牆上的鏡子，報告至今沒有寫完。'},
  // 變賣家產 × 誠信招牌
  {id:'toothless-smile',on:'G06:A',after:['G05:A'],title:'沒有金牙的微笑',
    judgment:'為了發分紅，公會連會長的金牙都賣了。新招牌掛上時，會長笑得特別真誠，因為他已經沒有金牙可以閃了。',
    chronicle:'公會先變賣家產發分紅，連會長的金牙都賣了；後來掛上誠信招牌，會長那個缺了一顆牙的笑容，反而成了招牌最好的廣告。'},
  {id:'sign-over-teeth',on:'G05:A',after:['G06:A'],title:'招牌比牙重要',
    judgment:'誠信招牌才剛掛上，會長不敢反悔分紅承諾，只好變賣商船和自己的金牙來兌現。他說：「招牌比牙重要。」',
    chronicle:'誠信招牌先掛上大門，會長因此不敢食言，賣掉商船和金牙也要發分紅。這是招牌第一次真正發揮作用，代價是一顆金牙。'},
  // 王子打工 × 帳房背鍋
  {id:'prince-carries-ledgers',on:'G04:B',after:['G03:B'],title:'皇室搬的箱子不能查',
    judgment:'稅務官來查帳房時，替帳房搬帳本的正是在公會打工還債的王子。稅務官不敢查皇室成員搬的箱子，於是只查了箱子外面。',
    chronicle:'王子先到公會打工還債，後來稅務官來查帳房，只敢檢查王子搬來的箱子外殼。帳房因此被罰，箱子裡的東西至今沒人看過。'},
  {id:'prince-copies-ledgers',on:'G03:B',after:['G04:B'],title:'王子抄帳本',
    judgment:'帳房剛被罰抄帳本一百遍，王子就來公會打工還債。會長分配給王子的第一份工作是：幫帳房抄帳本。王子抄到第三遍，發現了會長的私人帳戶。',
    chronicle:'帳房先被罰抄帳本，王子來打工後被派去幫忙抄寫，抄到第三遍就發現了會長的私人帳戶——比帳房早了四十七遍。'},
  // 跨章：第一章的決定找上商會
  {id:'broke-prince-forgiven',on:'G03:A',after:['L08:B'],title:'免債之後又借了一筆',
    judgment:'王子為了給公主早已掏空私房錢。會長宣布免除他的債務時，王子感動得當場又借了一筆。',
    chronicle:'王子在王宮時已為公主掏空私房錢，到了商會欠款又被一筆勾銷，他感動之餘當場再借一筆，成為商會唯一越免越欠的客戶。'},
  {id:'broke-prince-collected',on:'G03:B',after:['L08:B'],title:'一箱簽名照',
    judgment:'會長登門催債，才發現王子的私房錢早就全給了公主，家裡只剩一箱簽名照。會長收下整箱照片抵債，估價三枚銅幣。',
    chronicle:'王子在王宮時已把私房錢全給了公主，會長上門催債只收到一箱簽名照。照片後來成了公會倉庫最難賣的庫存。'},
  {id:'king-lottery-gift',on:'G02:B',after:['L04:B'],title:'國王送來的中獎通知',
    judgment:'國王聽說公會收禮合法，立刻送來一份禮物：魔王寄給他的「恭喜中獎」通知，請會長幫忙兌獎。',
    chronicle:'國王在王宮被魔王騙走保證金後，聽說商會收禮合法，就把那張「恭喜中獎」通知當成禮物送來。會長至今還在找兌獎窗口。'},
  {id:'potion-souvenirs',on:'G05:A',after:['L07:B'],title:'打嗝紀念品',
    judgment:'公會變賣家產時，倉庫裡最難賣的是國王寄售的整批魔藥。最後會長自己買下，當作分紅紀念品發給股東，股東們集體打嗝了一週。',
    chronicle:'國王直播賣剩的魔藥寄放在商會倉庫，公會變賣家產時賣不掉，只好當成分紅紀念品。那一週，股東大會的發言全被打嗝打斷。'},
  {id:'tax-officer-unpaid-fine',on:'G04:B',after:['L05:A'],title:'不敢敲的那扇門',
    judgment:'這位稅務官，就是當年敢給國王開罰單的那位大臣，卻在會長辦公室門口停下腳步。他解釋：「國王那張罰單，到現在還沒繳。」',
    chronicle:'當年給國王開罰單的大臣轉任稅務官，到了商會卻不敢查會長，理由是國王的罰單至今未繳，他不想再多一筆收不回來的帳。'},
  {id:'temple-blessing',on:'G06:A',after:['L04:A'],title:'會發紫光的招牌',
    judgment:'神殿的「魔界教務長」祭司親自為誠信招牌開光，招牌從此每到夜裡就發出淡淡的紫光。',
    chronicle:'投靠魔界的祭司後來替商會的誠信招牌開光，招牌從此夜裡發紫光。商人們說，這是全城唯一一塊經過魔界認證的誠信。'},
  {id:'bear-successor',on:'G01:A',after:['L01:B'],title:'候補第一名',
    judgment:'第一位來應徵會長接班人的是熊公主。她在面試時單手舉起會長的辦公桌，股東當場把她列為候補第一名；會長則決定把交接期延長到一年。',
    chronicle:'熊公主得知會長要退休，立刻前來應徵接班人，單手舉起辦公桌通過面試。會長隨即把交接期延長為一年，理由是「需要時間習慣新桌子的高度」。'},
  {id:'library-gift-returned',on:'G02:A',after:['L08:A'],title:'捐款也算禮物',
    judgment:'禁收禮物的條文公布後，公主捐給公會的一袋金幣被原封退回，附上一張公文：「依章程，捐款也算禮物。」',
    chronicle:'公主在王宮拿到金幣後，曾捐一袋給商會，結果被新章程原封退回。她把退回的金幣拿去加蓋了一層樓，取名「禮物禁令紀念館」。'},
];
const GUILD_BRIEFINGS = [
  {about:'G06:B',stage:'G01',when:f=>f.ironicSign,text:'大門上的反諷招牌已經成了城市地標，觀光客每天都來拍照。'},
  {about:'G05:A',stage:'G01',when:f=>f.guildSoldAssets,text:'公會賣到只剩一艘小船，會長嘴裡少了一顆金牙。'},
  {about:'L01:B',stage:'G01',when:f=>f.bearPrincess,text:'熊公主最近常在公會門口晃，說是想找份正職。'},
  {about:'G03:A',stage:'G02',when:f=>f.princeDebtForgiven,text:'自從王子的欠條被撕掉，全城一半的人都自稱是王子的朋友。'},
  {about:'G01:B',stage:'G02',when:f=>f.presidentRefuses,text:'會長還在調查到底是誰催他退休，辦公室門口的包裹越堆越高。'},
  {about:'L04:B',stage:'G02',when:f=>f.kingScammed,text:'國王最近手頭很緊，正在找人幫他兌一張中獎通知。'},
  {about:'G02:B',stage:'G03',when:f=>f.giftsLegal,text:'收禮合法化之後，王子每天都在研究該送會長什麼。'},
  {about:'G04:B',stage:'G03',when:f=>f.accountantPunished,text:'帳房還在罰抄帳本，桌上的紙已經堆到天花板。'},
  {about:'L08:B',stage:'G03',when:f=>f.princeBroke,text:'王子的私房錢早就全給了公主，家裡只剩一箱簽名照。'},
  {about:'G05:B',stage:'G04',when:f=>f.vaultIOUs,text:'金庫裡只剩一疊借據，借款人欄的字跡都很眼熟。'},
  {about:'G03:B',stage:'G04',when:f=>f.princeWorksAtGuild,text:'王子在公會倉庫打工，負責搬運帳本箱。'},
  {about:'L05:A',stage:'G04',when:f=>f.kingFined,text:'王宮派來的稅務官，正是當年給國王開罰單的那位大臣。'},
  {about:'G04:A',stage:'G05',when:f=>f.presidentSelfAudit,text:'會長上週查帳查到自己，這週股東就來敲門了。'},
  {about:'G06:A',stage:'G05',when:f=>f.honestySign,text:'大門上的誠信招牌讓會長不敢隨便承諾，也不敢隨便反悔。'},
  {about:'L07:B',stage:'G05',when:f=>f.kingJobs.includes('potion'),text:'國王寄售的魔藥還堆在公會倉庫，沒有人敢買。'},
  {about:'G01:B',stage:'G06',when:f=>f.presidentRefuses,text:'會長拒絕退休，正在找人幫他重新打造形象。'},
  {about:'G05:B',stage:'G06',when:f=>f.vaultIOUs,text:'金庫只剩借據的消息，已經傳遍大街小巷。'},
  {about:'L04:A',stage:'G06',when:f=>f.priestDemonist,text:'神殿的魔界教務長來信，表示願意替公會的新招牌開光。'},
];
const GUILD_RIPPLES = {
  'G01:A':()=>'會長的退休交接期定為一年，他每天回來喝免費的茶。',
  'G01:B':()=>'公告欄每天早上都會出現同一張紙，會長每天早上都會撕掉它。',
  'G02:A':()=>'會長辦公室門口的禮物堆被清空了，只剩一張生日卡。',
  'G02:B':()=>'會長辦公室外的送禮隊伍已經排到碼頭。',
  'G03:A':()=>'全城一半的人拿著欠條，排隊要求比照王子辦理。',
  'G03:B':()=>'王子的工作證上寫著「臨時搬運員（皇室）」。',
  'G04:A':()=>'會長宣布稽查圓滿結束，帳房的字被認定寫得太工整。',
  'G04:B':()=>'帳房還在罰抄帳本，已經抄到第五十遍。',
  'G05:A':()=>'公會只剩一艘小船，會長講話時嘴角有點漏風。',
  'G05:B':()=>'金庫裡只剩一疊借據，會長稱之為流動性很好的資產。',
  'G06:A':()=>'會長最近不敢說「下次一定」，拖欠的帳款少了一半。',
  'G06:B':()=>'反諷招牌成了城市地標，拆除需要全城公投。',
};
function guildFirstBriefing(facts,prelude){
  return prelude?.length
    ? '你在王宮的表現傳到了金幣商會，文書局把你借調過來。會長特地為你多準備了一種符號：問號。'
    : '皇家文書局把你借調到金幣商會。會長特地為你多準備了一種符號：問號。';
}
const GUILD_WORLD = Object.freeze({initial:GUILD_INITIAL,effects:GUILD_EFFECTS,chains:GUILD_CHAINS,briefings:GUILD_BRIEFINGS,ripples:GUILD_RIPPLES,first:guildFirstBriefing});

const GUILD_CHRONICLE = {
  G01:{A:'會長在掌聲中宣布退休，卻把交接期定為一年。他每天準時回公會喝茶，被股東稱為「最勤勞的退休人士」。',
    B:'人事公告被貼成「會長退休了沒？人反對」，會長宣布暫緩退休，直到查出是誰反對。股東從此分成兩派，開會比做生意還勤。'},
  G02:{A:'章程明文禁止會長收禮，辦公室門口的禮物一夜退空。會長的生日只收到一張卡片，上面寫著「祝福不算禮物」。',
    B:'一個問號讓收禮合法化，會長辦公室外的送禮隊伍一路排到碼頭。帳房最後把公會所有收入都記成「心意」。'},
  G03:{A:'會長當眾撕掉王子的欠條，全城一半的人隔天都成了王子的朋友，拿著欠條要求比照辦理。',
    B:'會長帶著算盤登門催債，王子的皇室身分被估價三枚銅幣。王子從此在公會倉庫打工，工作證寫著「臨時搬運員（皇室）」。'},
  G04:{A:'稅務官沒有出手，會長親自查帳，結果查到的每一筆可疑支出都是自己簽的名。他宣布結案，理由是帳房的字太工整。',
    B:'稅務官放過會長、只查帳房，帳房被罰抄帳本一百遍，抄到一半發現了會長的私人帳戶。'},
  G05:{A:'會長拍胸脯保證分紅沒有問題，公會為此賣掉兩艘商船和會長的金牙，從此只剩一艘小船。',
    B:'公告結尾多了一個問號，股東衝進金庫，只看到一疊借據。會長稱之為「流動性很好的資產」。'},
  G06:{A:'大門掛上誠信招牌，會長被迫守信，連「下次一定」都不敢說，公會的拖欠帳款少了一半。',
    B:'誠信招牌變成反諷，全城經過都會笑著點頭。招牌後來被列為城市地標，拆除需要全城公投。'},
};
function makeGuildChronicle(game){
  const history=game?.history??[],prelude=game?.prelude??[];
  const valid=history.filter(h=>h.valid&&GUILD_CHRONICLE[h.stageId]?.[h.choiceId]);
  const entries=valid.map(h=>GUILD_CHRONICLE[h.stageId][h.choiceId]);
  const world=traceWorld(history,GUILD_WORLD,prelude);
  const connections=world.steps.flatMap(s=>s.reactions).map(c=>({title:c.title,text:c.chronicle}));
  const seen=new Set(valid.map(h=>`${h.stageId}:${h.choiceId}`));
  const doomed=game?.phase==='defeat'||game?.endingReason==='chaos';
  const title=doomed
    ? (game.invalidAttempts>=4?'《公證處把商會退件了》':'《一個符號，一間商會》')
    : seen.has('G02:B')&&seen.has('G03:A')?'《禮物經濟學》'
    : seen.has('G01:B')&&seen.has('G06:B')?'《全城都知道他不退休》'
    : game.chaos>=5?'《一間還沒倒的商會》'
    : '《金幣商會居然還在營業》';
  const opening=prelude.length
    ? '王宮的遺囑試辦告一段落，書記官被借調到金幣商會。會長聽說這位書記官很會放逗號，特地多準備了一種符號——問號。王宮裡發生過的事，很快就跟著書記官一起搬進了商會。'
    : '皇家文書局把書記官借調到金幣商會。會長聽說這位書記官很會放逗號，特地多準備了一種符號——問號。他沒想到，問號比逗號更會惹事。';
  const acts=[];
  const chapterTitles=['上半年：合約開始有了語氣','下半年：股東發現語氣比金幣貴'];
  for(let j=0;j<2;j++){const subset=entries.slice(j*3,j*3+3);if(subset.length)acts.push({title:chapterTitles[j],text:subset.join(' ')});}
  const detours=history.filter(x=>!x.valid).length,last=history.at(-1);
  let epilogue;
  if(doomed){
    const why=last?.valid
      ? `最後一份被執行的合約是「${last.punctuated}」。股東們還沒決定要先告誰，商會就已經宣告破產。`
      : `最後一份合約寫成「${last?.punctuated??'（內容已遺失）'}」。公證處看不懂，會長卻已經蓋了章，於是商會的信用正式歸零。`;
    epilogue=`${why} 帳房最後記錄：書記官完成了 ${valid.length} 份可執行合約，製造 ${detours} 次退件，信用崩壞達到 ${game.chaos}。商會倒閉後，唯一還在營業的是公證處，因為他們正在研究破產公告該用逗號還是問號結尾。`;
  }else{
    const f=world.facts;
    const leader=f.presidentRefuses?'會長仍然沒有退休，公告欄每天早上還是會出現那張紙。':f.presidentRetiring?'會長的退休交接期還剩半年，他每天照常回來喝茶。':'會長仍坐在原位，努力記住每份合約的語氣。';
    const money=f.vaultIOUs?'金庫裡的借據被裝框掛在大廳。':f.guildSoldAssets?'公會只剩一艘小船，但分紅一毛沒少。':'金庫裡居然還有金幣。';
    epilogue=`六份合約全部蓋章。最後一份是「${valid.at(-1)?.punctuated??'合約辦結'}」，而商會還保有 ${7-game.chaos} 點距離破產的信用。${leader}${money} 股東研究了你的 ${game.riskyCount} 次高風險標點與 ${detours} 次退件，決定聘你為「首席語氣顧問」——年薪照舊，問號另計。`;
  }
  return {title,opening,acts,connections,epilogue,signature:history.map(h=>`${h.stageId}:${h.choiceId??`X${h.mark??''}${h.position}`}`).join('|')};
}
export {GUILD_INITIAL,GUILD_EFFECTS,GUILD_CHAINS,GUILD_BRIEFINGS,GUILD_RIPPLES,GUILD_WORLD,GUILD_CHRONICLE,makeGuildChronicle};
