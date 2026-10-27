/**
 * Chapter 3 — 大教廷. Comma, question mark or exclamation mark (one per notice).
 * Same causal design as chapters 1–2. The prelude may hold chapter 1 AND chapter 2 decisions;
 * traceWorld replays them through ROYAL then GUILD before this chapter starts. Story only.
 */
import {ROYAL_WORLD,traceWorld} from './world.mjs';
import {GUILD_WORLD} from './guild.mjs';
const CATHEDRAL_INITIAL = Object.freeze({
  bishopBarred:false, bishopVIP:false, fireCoveredUp:false, fireAlarm:false,
  indulgencesStopped:false, indulgencesContinue:false, confessionHoliday:false, confessionMarathon:false,
  popeAbdicates:false, abdicationRumor:false, popeKneelsToKing:false, believersKneelToKing:false,
});
const CATHEDRAL_EFFECTS = {
  'C01:A': f=>({...f, bishopBarred:true}),
  'C01:B': f=>({...f, bishopVIP:true}),
  'C02:A': f=>({...f, fireCoveredUp:true}),
  'C02:B': f=>({...f, fireAlarm:true}),
  'C03:A': f=>({...f, indulgencesStopped:true}),
  'C03:B': f=>({...f, indulgencesContinue:true}),
  'C04:A': f=>({...f, confessionHoliday:true}),
  'C04:B': f=>({...f, confessionMarathon:true}),
  'C05:A': f=>({...f, popeAbdicates:true}),
  'C05:B': f=>({...f, abdicationRumor:true}),
  'C06:A': f=>({...f, popeKneelsToKing:true}),
  'C06:B': f=>({...f, believersKneelToKing:true}),
};
const CATHEDRAL_CHAINS = [
  // 失火 × 告解
  {id:'confessing-firefighter',on:'C04:B',after:['C02:A'],title:'第一個開口的人',
    judgment:'聖殿失火被壓下來之後，全城連夜排隊告解。排在隊伍最前面、第一個開口的，正是那晚負責滅火卻把通報歸檔的神父。',
    chronicle:'聖殿失火先被壓了下來，後來全城排隊告解時，第一個坦白的就是那位把通報歸檔的神父。焦味的來源終於水落石出。'},
  {id:'fire-during-queue',on:'C02:A',after:['C04:B'],title:'所有人都在排隊',
    judgment:'全城排隊告解的那一晚，聖殿後殿悄悄著火了。所有人都在城門口排隊，所以真的沒有人知道。',
    chronicle:'告解隊伍排到城門口的那一夜，聖殿後殿起火，因為全城都在排隊，直到隔天都沒有人發現。'},
  // 贖罪券 × 天堂座位
  {id:'seat-for-sale',on:'C01:B',after:['C03:B'],title:'主教席開賣',
    judgment:'贖罪券照常販售，天堂的保留座位也跟著開放購買。第一個售出的，就是主教的位子——買主是主教自己。',
    chronicle:'贖罪券照賣之後，天堂座位也開放購買，主教自掏腰包買下保留席，教廷稱之為「自主預約制度」。'},
  {id:'same-row-addon',on:'C03:B',after:['C01:B'],title:'主教同排加購',
    judgment:'天堂先替主教保留了座位，贖罪券隨即推出「主教同排」加購方案，銷量一夜翻倍。',
    chronicle:'天堂替主教保留座位後，贖罪券推出「主教同排」加購方案，教廷因此度過了財務危機，也失去了最後一點面子。'},
  // 退位 × 下跪
  {id:'abdicating-knees',on:'C06:A',after:['C05:A'],title:'反正下週就不是我',
    judgment:'已經宣布退位的教宗向國王下跪時特別輕鬆，還順便說了一句：「反正下週就不是我了。」',
    chronicle:'教宗先宣布退位，後來向國王下跪時毫無心理負擔，史官記下他的名言：「反正下週就不是我了。」'},
  {id:'knee-leave',on:'C05:A',after:['C06:A'],title:'膝蓋需要休養',
    judgment:'向國王下跪的畫面傳遍全城一週後，教宗宣布退位，理由寫得很誠實：「膝蓋需要休養。」',
    chronicle:'教宗先向國王下跪，一週後宣布退位，官方理由是膝蓋需要休養，民間理由則多達三十七種。'},
  // 停賣 × 懺悔假
  {id:'no-overtime',on:'C04:A',after:['C03:A'],title:'付不出加班費',
    judgment:'贖罪券停賣後，教會發不出告解神父的加班費。神父們一商量，乾脆宣布今天不用懺悔。',
    chronicle:'贖罪券先停賣，教會付不出加班費，神父們便順勢宣布懺悔假——史學家認為，這是教會史上第一次因預算而赦罪。'},
  {id:'nobody-needs-it',on:'C03:A',after:['C04:A'],title:'不懺悔也沒差',
    judgment:'全城放了一天懺悔假，隔天大家發現不懺悔也沒差，贖罪券的銷量歸零。教宗順勢宣布停賣，假裝這是他的主意。',
    chronicle:'懺悔假讓全城發現不懺悔也沒差，贖罪券乏人問津，教廷隨後宣布停賣，並對外宣稱是改革成果。'},
  // 警報 × 傳聞
  {id:'which-is-a-drill',on:'C05:B',after:['C02:B'],title:'哪個是演習',
    judgment:'失火警報才響過不久，教宗退位的傳聞又起。信徒們已經分不清哪個是演習，乾脆帶著水桶去聽教宗澄清。',
    chronicle:'聖殿失火警報之後，教宗退位的傳聞接著出現，信徒們提著水桶去聽澄清記者會，現場一度非常潮濕。'},
  {id:'test-who-runs',on:'C02:B',after:['C05:B'],title:'誰會先跑',
    judgment:'退位傳聞還沒平息，聖殿又響起失火警報。有人懷疑這是教宗在測試誰會先跑——第一個跑出去的是樞機團團長。',
    chronicle:'退位傳聞未平，失火警報又響，第一個衝出聖殿的是樞機團團長。從此他在接班人選中的排名一路下滑。'},
  // 跨章：第一章
  {id:'bear-lifts-pope',on:'C06:A',after:['L01:B'],title:'熊公主扶起教宗',
    judgment:'教宗向國王下跪後膝蓋卡住起不來，最後是熊公主一手把他扶起來，順便把跪墊也一起舉高。',
    chronicle:'教宗向國王下跪時膝蓋卡住，是當年徒手救出魔王的熊公主把他扶起來的。教廷因此追贈她「年度最有力信徒」。'},
  {id:'paper-crown-king',on:'C06:B',after:['L05:B'],title:'戴著紙囚帽的陛下',
    judgment:'信徒們轉身向國王下跪時，國王頭上還戴著王子做的那頂紙囚帽。場面一度非常莊嚴，也非常奇怪。',
    chronicle:'信徒改向國王下跪的那天，國王頭上戴的還是當年王子親手做的紙囚帽。這頂帽子後來也被收進教廷的聖物庫。'},
  {id:'demon-seats',on:'C01:A',after:['L04:A'],title:'魔界還有位子',
    judgment:'被天堂拒於門外的主教們，隔天收到魔界教務長祭司的邀請函：「我們這邊還有位子，附早餐。」',
    chronicle:'天堂宣布客滿後，當年投靠魔界的祭司立刻向主教們發出邀請函，魔界的入會人數創下新高。'},
  {id:'potion-queue',on:'C04:B',after:['L07:B'],title:'排隊不無聊',
    judgment:'告解隊伍排到城門口，國王在隊伍旁擺攤賣魔藥，標語是「排隊不無聊，打嗝助懺悔」。',
    chronicle:'全城排隊告解那夜，國王在隊伍旁直播賣魔藥，信徒們一邊打嗝一邊懺悔，神父們表示這是史上最吵的告解夜。'},
  // 跨章：第二章
  {id:'guild-buys-indulgences',on:'C03:B',after:['G02:B'],title:'可以轉送的贖罪',
    judgment:'金幣商會的會長大量收購贖罪券，當成禮物轉送給客戶——反正商會章程說收禮合法。',
    chronicle:'商會的收禮條款與教廷的贖罪券一拍即合，會長把贖罪券當禮物四處轉送，教廷稱之為「信仰的流通性」。'},
  {id:'third-sign',on:'C02:A',after:['G06:B'],title:'第三塊招牌',
    judgment:'聖殿失火被壓了下來，但金幣商會那塊反諷招牌旁邊，有人連夜加掛了第三塊：「聖殿沒著火？全城都知道。」',
    chronicle:'聖殿失火被壓下的消息，最後是透過商會門口的第三塊反諷招牌傳開的。那條街從此被稱為「招牌大道」。'},
  {id:'president-objects',on:'C05:A',after:['G01:B'],title:'你這樣我很難做',
    judgment:'教宗宣布退位的消息傳到金幣商會，拒絕退休的會長連夜寄信勸阻：「你這樣會讓我很難做。」',
    chronicle:'教宗宣布退位後，商會那位拒絕退休的會長寫信抗議，認為這會帶起不良的退休風氣，並附上一份「領袖不退休聯盟」的入會申請表。'},
  {id:'one-boat-relief',on:'C03:A',after:['G05:A'],title:'剛好也買不起',
    judgment:'贖罪券停賣的消息傳來，只剩一艘小船的金幣商會鬆了一口氣：他們本來就付不起下一期的分期款。',
    chronicle:'贖罪券停賣時，變賣家產後只剩一艘小船的金幣商會正好付不出分期款，會長稱這是「神的安排」。'},
];
const CATHEDRAL_BRIEFINGS = [
  {about:'C03:B',stage:'C01',when:f=>f.indulgencesContinue,text:'贖罪券照常販售，聽說最新一批還附贈來世座位。'},
  {about:'C05:A',stage:'C01',when:f=>f.popeAbdicates,text:'教宗即將卸任，主教們開始打聽自己的來世安排。'},
  {about:'L04:A',stage:'C01',when:f=>f.priestDemonist,text:'魔界教務長祭司最近常在教廷門口發傳單。'},
  {about:'C04:B',stage:'C02',when:f=>f.confessionMarathon,text:'全城都在排隊告解，聖殿裡一個人也沒有。'},
  {about:'C05:B',stage:'C02',when:f=>f.abdicationRumor,text:'退位傳聞讓教廷人心惶惶，連蠟燭都沒人顧。'},
  {about:'G06:B',stage:'C02',when:f=>f.ironicSign,text:'金幣商會的反諷招牌很受歡迎，教廷也想掛一塊。'},
  {about:'C01:B',stage:'C03',when:f=>f.bishopVIP,text:'天堂替主教保留座位的消息傳開後，教廷收到一大堆來世預約。'},
  {about:'G05:A',stage:'C03',when:f=>f.guildSoldAssets,text:'金幣商會賣到只剩一艘小船，已經付不起任何分期款。'},
  {about:'G02:B',stage:'C03',when:f=>f.giftsLegal,text:'金幣商會的會長正在大量採購「可以轉送的禮物」。'},
  {about:'C02:A',stage:'C04',when:f=>f.fireCoveredUp,text:'聖殿後殿有一股焦味，但官方說法是「有人在烤麵包」。'},
  {about:'C03:A',stage:'C04',when:f=>f.indulgencesStopped,text:'贖罪券停賣後，教會發不出任何加班費。'},
  {about:'L07:B',stage:'C04',when:f=>f.kingJobs.includes('potion'),text:'國王又在城門口擺攤了，這次說要賣「懺悔專用」魔藥。'},
  {about:'C06:A',stage:'C05',when:f=>f.popeKneelsToKing,text:'教宗向國王下跪的畫面傳遍全城，他的膝蓋已經腫了三天。'},
  {about:'C02:B',stage:'C05',when:f=>f.fireAlarm,text:'聖殿上週才響過失火警報，信徒們對任何公告都很緊張。'},
  {about:'G01:B',stage:'C05',when:f=>f.presidentRefuses,text:'金幣商會的會長拒絕退休，最近一直寫信給教廷。'},
  {about:'C05:A',stage:'C06',when:f=>f.popeAbdicates,text:'教宗已經宣布卸任，最後一週的行程排得很滿。'},
  {about:'C04:A',stage:'C06',when:f=>f.confessionHoliday,text:'全城放了一天懺悔假，大家的膝蓋都很輕鬆。'},
  {about:'L01:B',stage:'C06',when:f=>f.bearPrincess,text:'熊公主最近常到教廷做禮拜，她坐過的長椅都得重修。'},
];
const CATHEDRAL_RIPPLES = {
  'C01:A':()=>'天堂入口貼出新告示，主教們一個個被請到旁邊排隊。',
  'C01:B':()=>'天堂的主教保留席已經坐滿，信徒們開始抗議座位分配。',
  'C02:A':()=>'聖殿後殿的焦味越來越重，官方堅稱是烤麵包。',
  'C02:B':()=>'失火警報之後，聖殿外每天都有信徒提著水桶站崗。',
  'C03:A':()=>'教會財務長每天對著空金庫禱告。',
  'C03:B':()=>'教廷的銷售櫃台前排起長龍，財務長笑得合不攏嘴。',
  'C04:A':()=>'懺悔假結束，告解室門口貼著「請自行反省」。',
  'C04:B':()=>'告解隊伍一路排到城門口，神父們輪班到深夜。',
  'C05:A':()=>'教宗卸任倒數中，樞機們開始私下拉票。',
  'C05:B':()=>'傳聞越傳越離譜，已經有人在賭下一任是誰。',
  'C06:A':()=>'教宗的膝蓋還在恢復，教廷暫停所有跪拜儀式。',
  'C06:B':()=>'信徒們改朝王宮陽台行禮，國王每天揮手揮到手痠。',
};
function cathedralFirstBriefing(facts,prelude){
  const sawGuild=(prelude??[]).some(h=>String(h.stageId).startsWith('G'));
  return sawGuild
    ? '你在王宮與商會的表現傳到了大教廷。教宗說，這一章你可以用三種符號：逗號、問號，還有驚嘆號。'
    : (prelude??[]).length
      ? '你在王宮的表現傳到了大教廷。教宗說，這一章你可以用三種符號：逗號、問號，還有驚嘆號。'
      : '皇家文書局把你借調到大教廷。教宗特地為你準備了三種符號：逗號、問號，還有驚嘆號。';
}
const CATHEDRAL_WORLD = Object.freeze({initial:CATHEDRAL_INITIAL,effects:CATHEDRAL_EFFECTS,chains:CATHEDRAL_CHAINS,
  briefings:CATHEDRAL_BRIEFINGS,ripples:CATHEDRAL_RIPPLES,first:cathedralFirstBriefing,previous:[ROYAL_WORLD,GUILD_WORLD]});

const CATHEDRAL_CHRONICLE = {
  C01:{A:'天堂宣布客滿，連主教都沒有位子。教廷成立「來世候補名單」，主教們第一次體會到排隊的感覺。',
    B:'天堂的座位被規定優先給主教，信徒們的來世被安排在走廊，教宗只好宣布走廊也算天堂。'},
  C02:{A:'聖殿失火被悄悄壓下，官方說法是有人在烤麵包，焦味卻飄了整整一個月。',
    B:'一聲緊急通報讓全城衝去救火，聖殿保住了，只燒掉一本寫錯字的祈禱書。'},
  C03:{A:'教廷下令停賣贖罪券，金庫在一週內見底，神父們開始兼差替人寫情書。',
    B:'教廷認定停賣才會破產，贖罪券照賣不誤，還推出了團購方案。'},
  C04:{A:'神父宣布全城不用懺悔一天，信徒們把那天稱為「良心假日」，隔天卻用三天來還。',
    B:'神父一個反問，全城連夜排隊告解，隊伍排到城門口，神父們輪班到天亮。'},
  C05:{A:'教宗在早餐時宣布下週退位，樞機們立刻開始拉票，教廷走廊變成了競選總部。',
    B:'教宗退位的傳聞傳遍全城，教宗每天出來澄清，越澄清越像真的。'},
  C06:{A:'信徒拒絕下跪，結果是教宗本人向國王下跪，這一幕成了教廷史上最常被引用的壁畫。',
    B:'信徒不再向教宗下跪，改向國王下跪；國王每天在陽台揮手，揮到需要冰敷。'},
};
function makeCathedralChronicle(game){
  const history=game?.history??[],prelude=game?.prelude??[];
  const valid=history.filter(h=>h.valid&&CATHEDRAL_CHRONICLE[h.stageId]?.[h.choiceId]);
  const entries=valid.map(h=>CATHEDRAL_CHRONICLE[h.stageId][h.choiceId]);
  const world=traceWorld(history,CATHEDRAL_WORLD,prelude);
  const connections=world.steps.flatMap(s=>s.reactions).map(c=>({title:c.title,text:c.chronicle}));
  const seen=new Set(valid.map(h=>`${h.stageId}:${h.choiceId}`));
  const doomed=game?.phase==='defeat'||game?.endingReason==='chaos';
  const title=doomed
    ? (game.invalidAttempts>=4?'《樞機團把教會退件了》':'《一個驚嘆號，兩個教會》')
    : seen.has('C05:A')&&seen.has('C06:A')?'《跪完就退位》'
    : seen.has('C02:A')&&seen.has('C04:B')?'《烤麵包的聖殿》'
    : game.chaos>=5?'《一座還沒分裂的教廷》'
    : '《大教廷居然還在營業》';
  const fromGuild=prelude.some(h=>String(h.stageId).startsWith('G'));
  const opening=fromGuild
    ? '王宮的遺囑和商會的合約都告一段落，書記官被借調到大教廷。教宗聽說這位書記官很會放逗號和問號，特地又準備了驚嘆號。王宮與商會裡發生過的事，也跟著書記官一起走進了聖殿。'
    : prelude.length
      ? '王宮的遺囑試辦告一段落，書記官被借調到大教廷。教宗聽說這位書記官很會放逗號，特地準備了問號和驚嘆號。王宮裡發生過的事，也跟著書記官一起走進了聖殿。'
      : '皇家文書局把書記官借調到大教廷。教宗說公告最重要的是語氣，所以給了三種符號：逗號、問號和驚嘆號。他沒想到，語氣比教義更難統一。';
  const acts=[];
  const chapterTitles=['春季：公告開始有了語氣','秋季：信徒發現語氣比教義更重要'];
  for(let j=0;j<2;j++){const subset=entries.slice(j*3,j*3+3);if(subset.length)acts.push({title:chapterTitles[j],text:subset.join(' ')});}
  const detours=history.filter(x=>!x.valid).length,last=history.at(-1);
  let epilogue;
  if(doomed){
    const why=last?.valid
      ? `最後一份發布的公告是「${last.punctuated}」。樞機團還沒決定要聽哪種語氣，教會就已經分成了兩派。`
      : `最後一份公告寫成「${last?.punctuated??'（內容已遺失）'}」。樞機團看不懂，封印卻已經蓋下，於是教會正式一分為二。`;
    epilogue=`${why} 檔案室最後記錄：書記官發布了 ${valid.length} 份可執行公告，製造 ${detours} 次退件，信仰動搖達到 ${game.chaos}。教會分裂後，兩邊唯一的共識是：下次公告不准用驚嘆號。`;
  }else{
    const f=world.facts;
    const pope=f.popeAbdicates?'教宗已經卸任，正在寫回憶錄，書名是《我只是想說得有精神一點》。':f.abdicationRumor?'教宗仍在位，每天早上照例澄清一次自己沒有要退位。':'教宗仍在位，最近說話特別小心語氣。';
    const heaven=f.bishopBarred?'主教們還在來世候補名單上排隊。':f.bishopVIP?'天堂的主教保留席依然坐滿。':'天堂的座位問題暫時沒有人敢再問。';
    epilogue=`六份公告全部發布。最後一份是「${valid.at(-1)?.punctuated??'公告完畢'}」，而教會還保有 ${7-game.chaos} 點距離分裂的信仰。${pope}${heaven} 樞機團研究了你的 ${game.riskyCount} 次高風險標點與 ${detours} 次退件，決定封你為「首席語氣審定官」——年薪照舊，驚嘆號另計。`;
  }
  return {title,opening,acts,connections,epilogue,signature:history.map(h=>`${h.stageId}:${h.choiceId??`X${h.mark??''}${h.position}`}`).join('|')};
}
export {CATHEDRAL_INITIAL,CATHEDRAL_EFFECTS,CATHEDRAL_CHAINS,CATHEDRAL_BRIEFINGS,CATHEDRAL_RIPPLES,CATHEDRAL_WORLD,CATHEDRAL_CHRONICLE,makeCathedralChronicle};
