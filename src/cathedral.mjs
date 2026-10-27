/**
 * Chapter 3 — 大教廷 (v4.5: three marks per notice — comma, question or exclamation).
 * Same causal design as chapters 1–2. The prelude may hold chapter 1 AND chapter 2 decisions;
 * traceWorld replays them through ROYAL then GUILD before this chapter starts. Story only.
 */
import {ROYAL_WORLD,traceWorld} from './world.mjs';
import {GUILD_WORLD} from './guild.mjs';
const CATHEDRAL_INITIAL = Object.freeze({
  pilgrimsStay:false, pilgrimCamp:false, believersPampered:false, believersOffended:false,
  bishopSnubbed:false, bellsAllDay:false, ignoranceDecree:false, believerSchool:false,
  popeAbdicates:false, abdicationRumor:false, popeKneelsToKing:false, believersKneelToKing:false,
});
const CATHEDRAL_EFFECTS = {
  'C01:A': f=>({...f, pilgrimsStay:true}),
  'C01:B': f=>({...f, pilgrimCamp:true}),
  'C02:A': f=>({...f, believersPampered:true}),
  'C02:B': f=>({...f, believersOffended:true}),
  'C03:A': f=>({...f, bishopSnubbed:true}),
  'C03:B': f=>({...f, bellsAllDay:true}),
  'C04:A': f=>({...f, ignoranceDecree:true}),
  'C04:B': f=>({...f, believerSchool:true}),
  'C05:A': f=>({...f, popeAbdicates:true}),
  'C05:B': f=>({...f, abdicationRumor:true}),
  'C06:A': f=>({...f, popeKneelsToKing:true}),
  'C06:B': f=>({...f, believersKneelToKing:true}),
};
const CATHEDRAL_CHAINS = [
  // 帳篷小鎮 × 被點名的信徒
  {id:'camp-grows',on:'C02:B',after:['C01:B'],title:'小鎮人口翻倍',
    judgment:'被神父點名批評的信徒們，扛著長椅搬進了修道院門口的帳篷小鎮。小鎮人口一夜翻倍，鎮長當場宣布成立第二座教堂。',
    chronicle:'朝聖者先在門口搭起帳篷小鎮，後來被神父點名的信徒也搬了進去，小鎮因此有了自己的教堂和自己的神父。'},
  {id:'latecomers-tent',on:'C01:B',after:['C02:B'],title:'遲到者互助會的帳篷',
    judgment:'朝聖者被擋在門外搭帳篷時，第一個來幫忙的是「遲到者互助會」——他們早就被教堂趕出來，對搭帳篷很有經驗。',
    chronicle:'被點名的信徒先成立了遲到者互助會，朝聖者被拒於門外後，互助會教他們搭帳篷，帳篷小鎮就此誕生。'},
  // 收留朝聖者 × 主教雪中等候
  {id:'soup-no-greeting',on:'C03:A',after:['C01:A'],title:'大家都在煮湯',
    judgment:'四十二位朝聖者住在院裡，主教來的時候全院都在廚房煮湯，沒有人聽到馬車聲。主教在門口聞了一個小時的湯香。',
    chronicle:'修道院收留了整團朝聖者，主教到訪時全院都在煮湯，沒人聽見馬車；主教在雪中聞了一小時湯香才被發現。'},
  {id:'bishop-shares-room',on:'C01:A',after:['C03:A'],title:'主教跟朝聖者擠一間',
    judgment:'主教在雪中等了一小時才進門，被安排住進唯一的客房——隔天四十二位朝聖者也到了，主教只好跟他們擠在同一間。',
    chronicle:'主教先在雪中久候，住進客房後又迎來四十二位朝聖者，只好和他們同住，據說他第一次聽完整本朝聖者笑話集。'},
  // 照做就好 × 信徒改跪國王
  {id:'obey-and-kneel',on:'C06:B',after:['C04:A'],title:'照做，不問為什麼',
    judgment:'既然信徒只要照做、不必知道為什麼，禮賓官的通知一出，全城就轉身向國王下跪，沒有一個人問理由。',
    chronicle:'教廷先規定信徒只要照做，後來禮賓通知讓信徒改跪國王，全城毫無疑問地照做——教廷第一次後悔沒寫理由。'},
  {id:'kneel-then-obey',on:'C04:A',after:['C06:B'],title:'先跪再說',
    judgment:'信徒已經改向國王下跪，教廷急著把人拉回來，下令「照做就好，不必知道為什麼」。信徒們照做了——繼續跪國王。',
    chronicle:'信徒先改跪國王，教廷才下令照做不必問，結果信徒照做的是上一份通知，繼續向國王下跪。'},
  // 信徒教室 × 退位傳聞
  {id:'students-correct',on:'C05:B',after:['C04:B'],title:'問號放錯了',
    judgment:'信徒教室的學生讀到退位新聞稿，紛紛寄信指出：「這裡的問號放錯了。」教廷只好再發一份更正，更正稿也被挑出兩個錯。',
    chronicle:'信徒教室開辦後，學生們開始批改教廷的新聞稿；退位傳聞那份被挑出三個標點錯誤，成為教室的經典考題。'},
  {id:'textbook-example',on:'C04:B',after:['C05:B'],title:'反面教材',
    judgment:'退位傳聞滿天飛的那週，教廷開辦了信徒教室，第一堂課就拿那份新聞稿當反面教材。',
    chronicle:'退位新聞稿先引發滿城傳聞，信徒教室隨後開課，把那份新聞稿當成「如何不要放問號」的範例。'},
  // 退位 × 下跪
  {id:'abdicating-knees',on:'C06:A',after:['C05:A'],title:'反正下週就不是我',
    judgment:'已經宣布退位的教宗向國王下跪時特別輕鬆，還順便說了一句：「反正下週就不是我了。」',
    chronicle:'教宗先宣布退位，後來向國王下跪時毫無心理負擔，史官記下他的名言：「反正下週就不是我了。」'},
  {id:'knee-leave',on:'C05:A',after:['C06:A'],title:'膝蓋需要休養',
    judgment:'向國王下跪的畫面傳遍全城一週後，教宗宣布退位，理由寫得很誠實：「膝蓋需要休養。」',
    chronicle:'教宗先向國王下跪，一週後宣布退位，官方理由是膝蓋需要休養，民間理由則多達三十七種。'},
  // 鐘響一整天 × 退位傳聞
  {id:'bells-mean-abdication',on:'C05:B',after:['C03:B'],title:'鐘聲是信號',
    judgment:'鐘才敲了一整天，教宗退位的傳聞就傳開了——山下村民一致認定，那陣鐘聲就是退位的信號。',
    chronicle:'鐘樓先敲了一整天，退位傳聞接著出現，村民們把兩件事連在一起，從此每次敲鐘都有人上山送行。'},
  {id:'farewell-crowd',on:'C03:B',after:['C05:B'],title:'上山送行',
    judgment:'退位傳聞還沒平息，鐘樓又敲了一整天，全城以為教宗今天就要退位，紛紛帶著花上山送行。',
    chronicle:'退位傳聞未平，鐘樓又響了一整天，全城上山為教宗送行，教宗只好出來向大家解釋他今天只是在等主教。'},
  // 跨章：第一章
  {id:'bear-lifts-pope',on:'C06:A',after:['L01:B'],title:'熊公主扶起教宗',
    judgment:'教宗向國王下跪後膝蓋卡住起不來，最後是熊公主一手把他扶起來，順便把跪墊也一起舉高。',
    chronicle:'教宗向國王下跪時膝蓋卡住，是當年徒手救出魔王的熊公主把他扶起來的。教廷因此追贈她「年度最有力信徒」。'},
  {id:'paper-crown-king',on:'C06:B',after:['L05:B'],title:'戴著紙囚帽的陛下',
    judgment:'信徒們轉身向國王下跪時，國王頭上還戴著王子做的那頂紙囚帽。場面一度非常莊嚴，也非常奇怪。',
    chronicle:'信徒改向國王下跪的那天，國王頭上戴的還是當年王子親手做的紙囚帽。這頂帽子後來也被收進教廷的聖物庫。'},
  {id:'demon-invites',on:'C02:B',after:['L04:A'],title:'魔界也收遲到的人',
    judgment:'被點名批評的信徒裡，有一位是魔界教務長祭司——他當場邀請所有被點名的人改去魔界做禮拜，並保證「遲到不點名」。',
    chronicle:'當年投靠魔界的祭司也在被點名之列，他把被點名的信徒全部招去魔界做禮拜，魔界的出席率因此首度超過教堂。'},
  {id:'potion-obey',on:'C04:A',after:['L07:B'],title:'喝就對了',
    judgment:'公告只寫「照做」之後，國王的魔藥攤也掛出一張新招牌：「喝就對了，不必知道為什麼。」銷量創新高。',
    chronicle:'教廷規定信徒只要照做之後，國王的魔藥攤立刻跟進「喝就對了」，成為那年最成功的一次直播。'},
  // 跨章：第二章
  {id:'guild-branch-in-camp',on:'C01:B',after:['G02:B'],title:'態度很差的分店',
    judgment:'帳篷小鎮開張後，第一家店是金幣商會開的分店。櫃員態度一樣很差，生意一樣很好。',
    chronicle:'帳篷小鎮的第一家店是金幣商會的分店，延續總店「不保證態度」的傳統，成為小鎮最熱門的店。'},
  {id:'refused-claimants-welcome',on:'C02:A',after:['G01:B'],title:'到教堂哭訴',
    judgment:'被商會拒賠的客戶聽說教堂特別客氣，全都跑來教堂哭訴。神父們一一鞠躬接待，順便收下了他們的抗議歌譜。',
    chronicle:'商會拒賠後，受害客戶轉往特別客氣的教堂哭訴，神父們鞠躬接待，教堂詩班從此多了一首抗議歌。'},
  {id:'one-boat-offer',on:'C05:A',after:['G04:B'],title:'退位後的工作機會',
    judgment:'教宗退位的消息傳到商會，只剩一艘小船的會長寫信問：「退位後要不要來我們這邊當顧問？薪水是半艘小船。」',
    chronicle:'教宗宣布退位後，變賣家產的金幣商會立刻來信挖角，開出的條件是半艘小船，教宗表示會慎重考慮。'},
  {id:'cat-greets-bishop',on:'C03:A',after:['G03:A'],title:'借調來的迎賓主任',
    judgment:'主教在雪中等候時，只有一隻貓出來迎接——那是金幣商會借調來的迎賓主任，牠很專業地蹭了蹭主教的鞋。',
    chronicle:'主教在雪中久候時，唯一的迎接者是商會借調來的迎賓貓，主教回去後在報告裡大力推薦全國教會比照辦理。'},
];
const CATHEDRAL_BRIEFINGS = [
  {about:'C03:B',stage:'C01',when:f=>f.bellsAllDay,text:'鐘樓前幾天敲了一整天，山下村民到現在還很緊張。'},
  {about:'C02:B',stage:'C01',when:f=>f.believersOffended,text:'被點名的信徒最近都在學怎麼搭帳篷。'},
  {about:'G02:B',stage:'C01',when:f=>f.rudeService,text:'商會櫃員的壞脾氣出了名，聽說他們打算到山上開分店。'},
  {about:'C01:B',stage:'C02',when:f=>f.pilgrimCamp,text:'修道院門口的帳篷小鎮選出了鎮長，鎮長第一件事是寫信給教宗。'},
  {about:'C01:A',stage:'C02',when:f=>f.pilgrimsStay,text:'四十二位朝聖者住在院裡，廚房的湯已經煮了一整個冬天。'},
  {about:'G01:B',stage:'C02',when:f=>f.claimsRefused,text:'被商會拒賠的客戶到處找地方訴苦。'},
  {about:'L04:A',stage:'C02',when:f=>f.priestDemonist,text:'魔界教務長祭司最近常在教廷門口發傳單。'},
  {about:'C01:A',stage:'C03',when:f=>f.pilgrimsStay,text:'院裡住滿了朝聖者，每個房間都飄著湯味。'},
  {about:'C05:B',stage:'C03',when:f=>f.abdicationRumor,text:'退位傳聞讓全城對任何聲響都很敏感。'},
  {about:'G03:A',stage:'C03',when:f=>f.catPromoted,text:'金幣商會的迎賓主任（一隻貓）最近被借調到修道院。'},
  {about:'C06:B',stage:'C04',when:f=>f.believersKneelToKing,text:'信徒們最近都朝王宮的方向行禮，教廷很緊張。'},
  {about:'C05:B',stage:'C04',when:f=>f.abdicationRumor,text:'那份退位新聞稿被全城討論了一整週。'},
  {about:'L07:B',stage:'C04',when:f=>f.kingJobs.includes('potion'),text:'國王又在城門口擺攤了，這次說要賣「懺悔專用」魔藥。'},
  {about:'C06:A',stage:'C05',when:f=>f.popeKneelsToKing,text:'教宗向國王下跪的畫面傳遍全城，他的膝蓋已經腫了三天。'},
  {about:'C03:B',stage:'C05',when:f=>f.bellsAllDay,text:'鐘樓前幾天敲了一整天，全城對鐘聲都很敏感。'},
  {about:'G04:B',stage:'C05',when:f=>f.guildSoldAssets,text:'金幣商會只剩一艘小船，會長最近一直寫信給教廷。'},
  {about:'C05:A',stage:'C06',when:f=>f.popeAbdicates,text:'教宗已經宣布卸任，最後一週的行程排得很滿。'},
  {about:'C04:A',stage:'C06',when:f=>f.ignoranceDecree,text:'最近的公告都只寫「照做」，不寫理由。'},
  {about:'L01:B',stage:'C06',when:f=>f.bearPrincess,text:'熊公主最近常到教廷做禮拜，她坐過的長椅都得重修。'},
];
const CATHEDRAL_RIPPLES = {
  'C01:A':()=>'修道院整個冬天都在煮湯，廚房門上刻著三個字。',
  'C01:B':()=>'門口的帳篷小鎮選出了自己的鎮長。',
  'C02:A':()=>'神父們對信徒鞠躬鞠到腰痠，奉獻反而變多了。',
  'C02:B':()=>'被點名的信徒成立了「遲到者互助會」。',
  'C03:A':()=>'主教的鞋子還在烤火，報告已經寫好了。',
  'C03:B':()=>'山下的村民還在修道院吃流水席，不肯下山。',
  'C04:A':()=>'公告只寫「照做」，信徒們照做了，包括做錯的那幾份。',
  'C04:B':()=>'信徒教室的學生開始寄信糾正教廷公告的標點。',
  'C05:A':()=>'教宗卸任倒數中，樞機們開始私下拉票。',
  'C05:B':()=>'傳聞越傳越離譜，已經有人在賭下一任是誰。',
  'C06:A':()=>'教宗的膝蓋還在恢復，教廷暫停所有跪拜儀式。',
  'C06:B':()=>'信徒們改朝王宮陽台行禮，國王每天揮手揮到手痠。',
};
function cathedralFirstBriefing(facts,prelude){
  const sawGuild=(prelude??[]).some(h=>String(h.stageId).startsWith('G'));
  return sawGuild
    ? '你在王宮與商會的表現傳到了大教廷。教廷的公告每份都要放三個符號：逗號、問號、驚嘆號可以混用。'
    : (prelude??[]).length
      ? '你在王宮的表現傳到了大教廷。教廷的公告每份都要放三個符號：逗號、問號、驚嘆號可以混用。'
      : '皇家文書局把你借調到大教廷。教廷的公告每份都要放三個符號：逗號、問號、驚嘆號可以混用。';
}
const CATHEDRAL_WORLD = Object.freeze({initial:CATHEDRAL_INITIAL,effects:CATHEDRAL_EFFECTS,chains:CATHEDRAL_CHAINS,
  briefings:CATHEDRAL_BRIEFINGS,ripples:CATHEDRAL_RIPPLES,first:cathedralFirstBriefing,previous:[ROYAL_WORLD,GUILD_WORLD]});

const CATHEDRAL_CHRONICLE = {
  C01:{A:'大雪中，一張紙條被讀成「留我不留？」，修道院打開大門，收留了整團朝聖者，煮了一整個冬天的湯。',
    B:'同一張紙條被讀成「天留，我不留！」，朝聖者被擋在門外，在雪地裡搭起一座有鎮長的帳篷小鎮。'},
  C02:{A:'教堂年報寫成「今年好，香火少，不得罪信徒」，神父們對信徒鞠躬到腰痠，奉獻反而變多了。',
    B:'教堂年報寫成「今年好香火，少不得罪信徒」，神父們開始點名批評信徒，信徒們另立門戶。'},
  C03:{A:'主教抵達時沒人迎接，鐘聲大作，全院衝出門時主教已在雪中等了一小時。',
    B:'鐘樓先問主教到了沒，迎接隊伍下山，鐘從早敲到晚，山下村民全上山幫忙，辦成了一場流水席。'},
  C04:{A:'教化方針被讀成「信徒，可使由之，不可使知之」，公告從此只寫「照做」，不寫理由。',
    B:'教化方針被讀成「信徒可，使由之；不可，使知之」，教廷開辦信徒教室，學生們開始批改教廷的標點。'},
  C05:{A:'樞機團的新聞稿宣布教宗下週退位，教廷走廊立刻變成競選總部。',
    B:'新聞稿多了一個問號，退位傳聞傳遍全城，教宗每天出來澄清，越澄清越像真的。'},
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
    ? (game.invalidAttempts>=4?'《樞機團把教會退件了》':'《三個符號，兩個教會》')
    : seen.has('C05:A')&&seen.has('C06:A')?'《跪完就退位》'
    : seen.has('C01:B')&&seen.has('C02:B')?'《帳篷小鎮的第二座教堂》'
    : game.chaos>=5?'《一座還沒分裂的教廷》'
    : '《大教廷居然還在營業》';
  const fromGuild=prelude.some(h=>String(h.stageId).startsWith('G'));
  const opening=fromGuild
    ? '王宮的遺囑和商會的合約都告一段落，書記官被借調到大教廷。教廷的公告更長、更莊嚴，每一份都得補上三個符號。王宮與商會裡發生過的事，也跟著書記官一起走進了聖殿。'
    : prelude.length
      ? '王宮的遺囑試辦告一段落，書記官被借調到大教廷。教廷的公告更長、更莊嚴，每一份都得補上三個符號。王宮裡發生過的事，也跟著書記官一起走進了聖殿。'
      : '皇家文書局把書記官借調到大教廷。教宗說公告最重要的是語氣，所以每份都要補上三個符號。他沒想到，斷句比教義更難統一。';
  const acts=[];
  const chapterTitles=['冬季：公告開始有了語氣','春季：信徒學會了斷句'];
  for(let j=0;j<2;j++){const subset=entries.slice(j*3,j*3+3);if(subset.length)acts.push({title:chapterTitles[j],text:subset.join(' ')});}
  const detours=history.filter(x=>!x.valid).length,last=history.at(-1);
  let epilogue;
  if(doomed){
    const why=last?.valid
      ? `最後一份發布的公告是「${last.punctuated}」。樞機團還沒決定要聽哪種語氣，教會就已經分成了兩派。`
      : `最後一份公告寫成「${last?.punctuated??'（內容已遺失）'}」。樞機團看不懂，封印卻已經蓋下，於是教會正式一分為二。`;
    epilogue=`${why} 檔案室最後記錄：書記官發布了 ${valid.length} 份可執行公告，製造 ${detours} 次退件，信仰動搖達到 ${game.chaos}。教會分裂後，兩邊唯一的共識是：下次公告只准放一個符號。`;
  }else{
    const f=world.facts;
    const pope=f.popeAbdicates?'教宗已經卸任，正在寫回憶錄，書名是《我只是想說得有精神一點》。':f.abdicationRumor?'教宗仍在位，每天早上照例澄清一次自己沒有要退位。':'教宗仍在位，最近說話特別小心語氣。';
    const gate=f.pilgrimCamp?'修道院門口的帳篷小鎮已經有了郵局。':f.pilgrimsStay?'修道院的湯還在煮。':'修道院門口一切平靜。';
    epilogue=`六份公告全部發布。最後一份是「${valid.at(-1)?.punctuated??'公告完畢'}」，而教會還保有 ${7-game.chaos} 點距離分裂的信仰。${pope}${gate} 樞機團研究了你的 ${game.riskyCount} 次高風險標點與 ${detours} 次退件，決定封你為「首席斷句審定官」——年薪照舊，驚嘆號另計。`;
  }
  return {title,opening,acts,connections,epilogue,signature:history.map(h=>`${h.stageId}:${h.choiceId??'X'}`).join('|')};
}
export {CATHEDRAL_INITIAL,CATHEDRAL_EFFECTS,CATHEDRAL_CHAINS,CATHEDRAL_BRIEFINGS,CATHEDRAL_RIPPLES,CATHEDRAL_WORLD,CATHEDRAL_CHRONICLE,makeCathedralChronicle};
