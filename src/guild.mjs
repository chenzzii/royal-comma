/**
 * Chapter 2 — 金幣商會 (v4.5: two marks per contract, readings with different segmentation).
 * Same causal design as chapter 1 (src/world.mjs) and reuses its trace: the chapter-1 history
 * (if the player continued from it) is the prelude. Story only: nothing here changes chaos or score.
 */
import {traceWorld} from './world.mjs';
const GUILD_INITIAL = Object.freeze({
  claimsPaid:false, claimsRefused:false, politeService:false, rudeService:false,
  catPromoted:false, dockVigil:false, dividendsShelved:false, guildSoldAssets:false,
  caseClosed:false, presidentSelfAudit:false, giftBan:false, giftsLegal:false,
});
const GUILD_EFFECTS = {
  'G01:A': f=>({...f, claimsPaid:true}),
  'G01:B': f=>({...f, claimsRefused:true}),
  'G02:A': f=>({...f, politeService:true}),
  'G02:B': f=>({...f, rudeService:true}),
  'G03:A': f=>({...f, catPromoted:true}),
  'G03:B': f=>({...f, dockVigil:true}),
  'G04:A': f=>({...f, dividendsShelved:true}),
  'G04:B': f=>({...f, guildSoldAssets:true}),
  'G05:A': f=>({...f, caseClosed:true}),
  'G05:B': f=>({...f, presidentSelfAudit:true}),
  'G06:A': f=>({...f, giftBan:true}),
  'G06:B': f=>({...f, giftsLegal:true}),
};
const GUILD_CHAINS = [
  // 拒賠 × 壞脾氣櫃台
  {id:'refused-and-scolded',on:'G02:B',after:['G01:B'],title:'抗議人數翻十倍',
    judgment:'被拒賠的客戶來櫃台抗議，櫃員依照新守則對他們發脾氣。抗議人數當天從十人變成一百人，合唱團也多了一個聲部。',
    chronicle:'商會先拒絕理賠，接著宣布得罪客人是常態，被拒賠的客戶在櫃台又被罵了一次，抗議人數從十人變成一百人。'},
  {id:'scolded-then-refused',on:'G01:B',after:['G02:B'],title:'這間商會是認真的',
    judgment:'櫃員本來就在得罪客人，財報又宣布一毛不賠。客戶們終於確定：這間商會不是在開玩笑，是在認真得罪人。',
    chronicle:'櫃員先被允許得罪客人，接著財報宣布拒絕理賠，客戶們從此相信這間商會言行一致——一致地兇。'},
  // 理賠 × 加倍分紅
  {id:'payout-then-dividends',on:'G04:B',after:['G01:A'],title:'兩堆金幣',
    judgment:'金庫才為了理賠少了一半，會長又宣布加倍分紅。帳房把剩下的金幣分成兩堆，一堆給客戶，一堆給股東，自己只留下算盤。',
    chronicle:'商會先大方理賠，又加倍分紅，帳房把最後的金幣分成兩堆送走，自己只剩一把算盤，後來被列為商會文物。'},
  {id:'dividends-then-payout',on:'G01:A',after:['G04:B'],title:'賣掉最後的倉庫',
    judgment:'加倍分紅才剛發完，會長又承認今年晦氣、該賠就賠。商會為此賣掉了最後一個倉庫，連那隻倉庫貓都差點被列入清單。',
    chronicle:'加倍分紅之後又遇上照賠，商會賣掉最後的倉庫，帳房在拍賣清單最後一行寫著：「貓，不賣。」'},
  // 迎賓貓 × 結案
  {id:'cat-finds-lunchbox',on:'G05:A',after:['G03:A'],title:'迎賓主任的證物',
    judgment:'結案當天，迎賓主任（那隻貓）叼著帳房的午餐盒走進會議室，盒子裡正是那袋金幣。會長決定不再追究，並替貓加薪。',
    chronicle:'貓先升任迎賓主任，後來在稽查會議上叼來裝著金幣的午餐盒。會長沒有追究帳房，反而替貓加了薪。'},
  {id:'busy-with-lunchbox',on:'G03:A',after:['G05:A'],title:'大家都在找午餐盒',
    judgment:'案子剛結，會長來巡視時沒人迎接——全倉庫都在幫帳房找他的午餐盒。只有貓出來迎接，於是升官。',
    chronicle:'稽查結案後，全倉庫忙著替帳房找午餐盒，會長來巡視時只有貓迎接，貓因此升任迎賓主任。'},
  // 碼頭空等 × 查到自己
  {id:'only-correct-day',on:'G05:B',after:['G03:B'],title:'全年唯一準的一天',
    judgment:'會長下令全面查帳，查出全年只有一天帳目完全正確——就是全員去碼頭空等、倉庫只剩貓顧的那天。會長開始懷疑問題出在人。',
    chronicle:'全員去碼頭空等的那天，後來被稽查認定為全年唯一帳目正確的一天，會長因此認真考慮讓貓接管帳房。'},
  {id:'back-door-president',on:'G03:B',after:['G05:B'],title:'改走後門',
    judgment:'會長查帳查到自己之後，不好意思走正門，改從後門進倉庫巡視。全員在碼頭空等了一整天。',
    chronicle:'會長在稽查中查到自己後，開始改走後門，結果全倉庫在碼頭空等了一天，只有貓知道會長已經進來了。'},
  // 收禮 × 結案
  {id:'gift-alibi',on:'G05:A',after:['G06:B'],title:'客戶送的心意',
    judgment:'收禮已經合法化，帳房順勢說明：那袋金幣是「客戶送的心意」。案子當天結案，連午餐盒都被登記成禮品包裝。',
    chronicle:'收禮合法之後，金庫失竊案被帳房解釋成「客戶的心意」，當天結案，午餐盒被登記為禮品包裝。'},
  {id:'relabel-as-gift',on:'G06:B',after:['G05:A'],title:'重新登記',
    judgment:'案子才剛結，章程就宣布收禮合法。帳房立刻把午餐盒裡的金幣重新登記成「禮物」，一切都合法了。',
    chronicle:'金庫案先結了案，收禮隨即合法化，帳房把午餐盒裡的金幣補登為禮物，被股東稱為「最有效率的洗白」。'},
  // 跨章：第一章的決定找上商會
  {id:'bear-at-counter',on:'G02:B',after:['L01:B'],title:'櫃台被搬到門外',
    judgment:'櫃員依照新守則對一位女客人發脾氣，才發現她是熊公主。整座櫃台被她單手搬到了門外，櫃員也一起。',
    chronicle:'商會允許得罪客人的第一天，櫃員就得罪了熊公主，櫃台連同櫃員被搬到門外，從此改成露天營業。'},
  {id:'prince-claims',on:'G01:A',after:['L08:B'],title:'王子也來申請',
    judgment:'王子也來申請理賠，項目是「私房錢全給了公主」。會長看在今年晦氣的份上，居然照賠了。',
    chronicle:'王子在王宮為公主掏空私房錢，到了商會竟以此申請理賠，會長在「晦氣」的名義下照賠，成了商會最離奇的一筆。'},
  {id:'king-lottery-gift',on:'G06:B',after:['L04:B'],title:'國王送來的中獎通知',
    judgment:'國王聽說商會收禮合法，立刻送來一份禮物：魔王寄給他的「恭喜中獎」通知，請會長幫忙兌獎。',
    chronicle:'國王在王宮被魔王騙走保證金後，聽說商會收禮合法，就把那張「恭喜中獎」通知當成禮物送來。會長至今還在找兌獎窗口。'},
  {id:'potion-souvenirs',on:'G04:B',after:['L07:B'],title:'打嗝紀念品',
    judgment:'商會變賣家產時，倉庫裡最難賣的是國王寄售的整批魔藥。最後會長自己買下，當作分紅紀念品發給股東，股東們集體打嗝了一週。',
    chronicle:'國王直播賣剩的魔藥寄放在商會倉庫，變賣家產時賣不掉，只好當成分紅紀念品。那一週，股東大會的發言全被打嗝打斷。'},
  {id:'king-fine-on-books',on:'G05:B',after:['L05:A'],title:'帳上的罰單',
    judgment:'全面查帳時，查出一筆奇怪的支出：國王那張罰單，是由商會代繳的。經手人簽名欄寫的是會長的名字。',
    chronicle:'國王在王宮被開的罰單，最後在商會帳上出現，代繳人是會長本人。稽查報告把這筆列為「政治公關費」。'},
  {id:'dragon-greeter',on:'G03:A',after:['L03:B'],title:'龍也想當迎賓主任',
    judgment:'會長被冷落的那天，倉庫門口除了貓，還有國王養的那條龍在曬太陽。龍看到貓升官，也遞了一份求職信。',
    chronicle:'貓升任迎賓主任那天，國王養的龍也在倉庫門口，隔天就遞了求職信，商會為此成立「動物人事委員會」。'},
];
const GUILD_BRIEFINGS = [
  {about:'G02:B',stage:'G01',when:f=>f.rudeService,text:'櫃台最近常傳出吵架聲，客戶投訴信堆滿了會長的桌子。'},
  {about:'G04:B',stage:'G01',when:f=>f.guildSoldAssets,text:'公會賣到只剩一艘小船，帳本也薄了很多。'},
  {about:'L08:B',stage:'G01',when:f=>f.princeBroke,text:'王子最近常來商會打聽有沒有什麼補助可以申請。'},
  {about:'G01:B',stage:'G02',when:f=>f.claimsRefused,text:'被拒絕理賠的客戶天天在門口合唱抗議歌。'},
  {about:'G01:A',stage:'G02',when:f=>f.claimsPaid,text:'理賠款發完後，金庫少了一半，櫃員們都很緊張。'},
  {about:'L01:B',stage:'G02',when:f=>f.bearPrincess,text:'熊公主最近常來商會買東西，每次都把櫃台壓出一道裂痕。'},
  {about:'G05:A',stage:'G03',when:f=>f.caseClosed,text:'那袋失蹤的金幣在帳房的午餐盒裡找到了，大家都假裝沒看見。'},
  {about:'G05:B',stage:'G03',when:f=>f.presidentSelfAudit,text:'會長最近不太好意思走正門，據說是查帳之後覺得尷尬。'},
  {about:'L03:B',stage:'G03',when:f=>f.kingJobs.includes('dragon'),text:'國王的龍最近常到倉庫附近曬太陽。'},
  {about:'G01:A',stage:'G04',when:f=>f.claimsPaid,text:'金庫為了理賠少了一半，股東們開始擔心今年的收入。'},
  {about:'G03:A',stage:'G04',when:f=>f.catPromoted,text:'倉庫貓升任迎賓主任後，薪水比學徒還高。'},
  {about:'L07:B',stage:'G04',when:f=>f.kingJobs.includes('potion'),text:'國王寄售的魔藥還堆在倉庫，沒有人敢買。'},
  {about:'G06:B',stage:'G05',when:f=>f.giftsLegal,text:'收禮合法化之後，帳房開始把每一筆收入都記成「心意」。'},
  {about:'G03:B',stage:'G05',when:f=>f.dockVigil,text:'全員到碼頭空等的那天，倉庫只有貓在顧。'},
  {about:'L05:A',stage:'G05',when:f=>f.kingFined,text:'國王的罰單還沒繳，催繳通知寄到了商會。'},
  {about:'G05:A',stage:'G06',when:f=>f.caseClosed,text:'金庫那筆帳已經結案，帳房的午餐盒被列為證物。'},
  {about:'G02:B',stage:'G06',when:f=>f.rudeService,text:'櫃台的態度越來越差，客人卻越來越多。'},
  {about:'L04:B',stage:'G06',when:f=>f.kingScammed,text:'國王最近手頭很緊，正在找人幫他兌一張中獎通知。'},
];
const GUILD_RIPPLES = {
  'G01:A':()=>'理賠款發完，金庫少了一半，帳房的手還在抽筋。',
  'G01:B':()=>'被拒賠的客戶在門口組成了合唱團。',
  'G02:A':()=>'櫃員們的臉頰集體抽筋，商會開始發微笑津貼。',
  'G02:B':()=>'商會門口掛上「本會不保證態度」的牌子。',
  'G03:A':()=>'倉庫貓升任迎賓主任，每天在門口巡邏。',
  'G03:B':()=>'全員在碼頭空等了一天，倉庫的帳反而對了。',
  'G04:A':()=>'股東大會改成每週一次，議題都一樣。',
  'G04:B':()=>'公會只剩一艘小船，會長講話時嘴角有點漏風。',
  'G05:A':()=>'那袋金幣在帳房的午餐盒裡找到了，案子照樣結了。',
  'G05:B':()=>'會長宣布稽查圓滿結束，結論是帳房的字太工整。',
  'G06:A':()=>'會長辦公室門口的禮物堆被清空了，只剩一張生日卡。',
  'G06:B':()=>'會長辦公室外的送禮隊伍已經排到碼頭。',
};
function guildFirstBriefing(facts,prelude){
  return prelude?.length
    ? '你在王宮的表現傳到了金幣商會，文書局把你借調過來。這裡的合約每份都要放兩個符號。'
    : '皇家文書局把你借調到金幣商會。這裡的合約每份都要放兩個符號。';
}
const GUILD_WORLD = Object.freeze({initial:GUILD_INITIAL,effects:GUILD_EFFECTS,chains:GUILD_CHAINS,briefings:GUILD_BRIEFINGS,ripples:GUILD_RIPPLES,first:guildFirstBriefing});

const GUILD_CHRONICLE = {
  G01:{A:'會長在財報上承認今年晦氣，該賠的照賠，金庫少了一半，信用評等反而升了一級。',
    B:'財報宣布今年大好、一毛不賠，被拒賠的客戶在門口組成「晦氣受害者聯盟」，天天合唱抗議歌。'},
  G02:{A:'客服守則要求千萬別得罪客人，櫃員們微笑到臉頰抽筋，商會只好加發微笑津貼。',
    B:'客服守則被讀成「得罪客人是免不了的」，櫃員第一天就罵哭三位大客戶，門口掛起「本會不保證態度」。'},
  G03:{A:'會長巡視時沒人迎接，只有倉庫貓出來，貓當場升任迎賓主任，薪水比學徒高。',
    B:'全倉庫衝去碼頭迎接會長，空等一整天；會長其實從後門進來，那天的帳卻是全年最準的。'},
  G04:{A:'股東問分紅多少，會長回「不重要」，分紅就此擱置，股東大會改成每週一次。',
    B:'會長宣布分紅要多、少賺不要緊，金庫一夜見底，公會變賣兩艘商船和會長的金牙。'},
  G05:{A:'金庫失竊案在帳房一句「沒有」之後結案，那袋金幣後來在他的午餐盒裡找到。',
    B:'會長不信帳房的「沒有」，下令全面查帳，結果每一筆可疑支出都是會長自己簽的。'},
  G06:{A:'章程明文禁止會長收禮，辦公室門口的禮物一夜退空，生日只收到一張「祝福不算禮物」的卡片。',
    B:'一個問號讓收禮合法化，送禮隊伍排到碼頭，帳房最後把所有收入都記成「心意」。'},
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
    ? (game.invalidAttempts>=4?'《公證處把商會退件了》':'《兩個符號，一間商會》')
    : seen.has('G01:B')&&seen.has('G02:B')?'《一致地兇》'
    : seen.has('G03:A')&&seen.has('G05:A')?'《貓比帳房可靠》'
    : game.chaos>=5?'《一間還沒倒的商會》'
    : '《金幣商會居然還在營業》';
  const opening=prelude.length
    ? '王宮的遺囑試辦告一段落，書記官被借調到金幣商會。這裡的合約都寫得又長又急，每一份都得補上兩個符號才看得懂。王宮裡發生過的事，很快就跟著書記官一起搬進了商會。'
    : '皇家文書局把書記官借調到金幣商會。這裡的合約都寫得又長又急，每一份都得補上兩個符號才看得懂——而會長從來不說他的意思是哪一種。';
  const acts=[];
  const chapterTitles=['上半年：合約開始有了語氣','下半年：股東發現斷句比金幣貴'];
  for(let j=0;j<2;j++){const subset=entries.slice(j*3,j*3+3);if(subset.length)acts.push({title:chapterTitles[j],text:subset.join(' ')});}
  const detours=history.filter(x=>!x.valid).length,last=history.at(-1);
  let epilogue;
  if(doomed){
    const why=last?.valid
      ? `最後一份被執行的合約是「${last.punctuated}」。股東們還沒決定要先告誰，商會就已經宣告破產。`
      : `最後一份合約寫成「${last?.punctuated??'（內容已遺失）'}」。公證處看不懂，會長卻已經蓋了章，於是商會的信用正式歸零。`;
    epilogue=`${why} 帳房最後記錄：書記官完成了 ${valid.length} 份可執行合約，製造 ${detours} 次退件，信用崩壞達到 ${game.chaos}。商會倒閉後，唯一還在營業的是公證處，因為他們正在研究破產公告該放幾個符號。`;
  }else{
    const f=world.facts;
    const front=f.catPromoted?'迎賓主任（那隻貓）照常在門口巡邏。':f.rudeService?'櫃台的態度依然很差，生意依然很好。':'櫃台的櫃員們正在練習新的微笑。';
    const money=f.guildSoldAssets?'公會只剩一艘小船，但分紅一毛沒少。':f.claimsRefused?'門口的抗議合唱團已經出了第二張專輯。':'金庫裡居然還有金幣。';
    epilogue=`六份合約全部蓋章。最後一份是「${valid.at(-1)?.punctuated??'合約辦結'}」，而商會還保有 ${7-game.chaos} 點距離破產的信用。${front}${money} 股東研究了你的 ${game.riskyCount} 次高風險標點與 ${detours} 次退件，決定聘你為「首席斷句顧問」——年薪照舊，符號另計。`;
  }
  return {title,opening,acts,connections,epilogue,signature:history.map(h=>`${h.stageId}:${h.choiceId??'X'}`).join('|')};
}
export {GUILD_INITIAL,GUILD_EFFECTS,GUILD_CHAINS,GUILD_BRIEFINGS,GUILD_RIPPLES,GUILD_WORLD,GUILD_CHRONICLE,makeGuildChronicle};
