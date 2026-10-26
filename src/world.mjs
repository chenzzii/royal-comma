/**
 * v4.1 world state & causal chains (pure, deterministic, no DOM).
 * history (valid decrees, in the order actually executed) → facts → reactions.
 * Rules never look at stage ORDER in the seed; they only look at what already happened.
 * Nothing here may reveal comma positions or which reading is riskier.
 */
const INITIAL_FACTS = Object.freeze({
  princess:'free', bearPrincess:false, demonRescuer:null, demonSpouse:null,
  kingJobs:[], kingFined:false, kingScammed:false, priestDemonist:false,
  princeDeeds:[], princessGold:false, princeBroke:false,
  dragonGourmet:false, burpPotion:false, guardsGlory:false,
});
const WORLD_EFFECTS = {
  'L01:A': f=>({...f, princess:'tower', demonRescuer:'prince'}),
  'L01:B': f=>({...f, princess:'free', bearPrincess:true, demonRescuer:'princess'}),
  'L02:A': f=>({...f, guardsGlory:true}),
  'L02:B': f=>({...f, princeDeeds:[...f.princeDeeds,'thief']}),
  'L03:A': f=>({...f, dragonGourmet:true}),
  'L03:B': f=>({...f, kingJobs:[...f.kingJobs,'dragon']}),
  'L04:A': f=>({...f, priestDemonist:true}),
  'L04:B': f=>({...f, kingScammed:true}),
  'L05:A': f=>({...f, kingFined:true}),
  'L05:B': f=>({...f, princeDeeds:[...f.princeDeeds,'punish']}),
  'L06:A': f=>({...f, demonSpouse:'hero'}),
  // A princess stuck in the tower climbs down to sign her own wedding contract.
  'L06:B': f=>({...f, demonSpouse:'princess', princess:'free'}),
  'L07:A': f=>({...f, burpPotion:true}),
  'L07:B': f=>({...f, kingJobs:[...f.kingJobs,'potion']}),
  'L08:A': f=>({...f, princessGold:true}),
  'L08:B': f=>({...f, princeBroke:true}),
};

/* Causal chains: `on` fires at the judgment of that decree when every `after` decree
 * was executed EARLIER (and optional `when(facts)` holds). `judgment` is shown on the
 * judgment screen right away; `chronicle` is the historian's later summary. */
const CHAINS = [
  // ① 公主、魔王、婚約（L01 × L06，四種組合 × 兩種先後）
  {id:'bear-wedding',on:'L06:B',after:['L01:B'],title:'熊公主即位（魔界聯姻特別篇）',
    judgment:'這位新娘，就是當初把魔王連同王座扛出魔塔的熊公主。婚禮上魔王緊張到腿軟，她一手扶住新郎、一手托住快塌的禮堂。賓客這才搞懂，這樁婚事到底是誰救了誰。',
    chronicle:'熊公主先徒手救出魔王，後來又嫁給了他。婚宴上她一手扶住腿軟的新郎、一手托住塌下來的禮堂；兩國簽下永久和平協議時，她還維持著這個姿勢。'},
  {id:'newlywed-rescue',on:'L01:B',after:['L06:B'],title:'熊公主即位（新婚救夫篇）',
    judgment:'被困在魔塔裡的，正是公主新婚第三天的丈夫。王子照例請假，公主扛起塔門，把魔王連同王座搬回新房，從此被稱為「熊公主」。',
    chronicle:'公主先與魔王成婚，沒想到新婚丈夫隨後就被困在魔塔。王子請了病假，公主徒手扛起塔門救夫，練成「熊公主」。魔王受訪時表示：「我以為我娶的是公主，原來娶的是救難隊。」'},
  {id:'late-fee',on:'L06:B',after:['L01:A'],when:f=>f.princess==='tower',title:'遲來的營救費',
    judgment:'公主原本還被困在塔上——當初王子只救走了魔王。她把累積的營救費請款單接成一條繩子垂降下塔，直接嫁給王子救出來的那位魔王，並把帳單轉寄給王子。',
    chronicle:'被王子留在塔上的公主，用請款單接成繩子垂降下塔，嫁給王子當初救走的魔王。婚禮上她把帳單交給王子，魔王補了一句：「我們現在是夫妻，你找我太太談。」'},
  {id:'groom-only',on:'L01:A',after:['L06:B'],title:'王子只救新郎',
    judgment:'新婚的公主與魔王一起被困在塔裡。王子衝上塔頂，禮貌地把新郎扛走，把新娘留在原地。他表示這叫「優先處理外交對象」。',
    chronicle:'公主與魔王新婚不久就雙雙被困在塔上，王子只救走了新郎。公主從此在塔上寄出加註利息的請款單，收件人一欄寫著「前伴郎」。'},
  {id:'bear-guest',on:'L06:A',after:['L01:B'],title:'勇者與熊公主的同學會',
    judgment:'勇者迎娶的魔王，正是熊公主不久前扛出魔塔的那一位。婚宴上熊公主用兩根手指搬開長桌，勇者突然懷疑，當初拯救世界的人一直不是自己。',
    chronicle:'熊公主救出的魔王，後來嫁給了勇者。婚宴上她只用兩根手指搬動長桌，勇者終於明白：這個世界一直是別人在拯救。'},
  {id:'save-heros-spouse',on:'L01:B',after:['L06:A'],title:'替勇者救另一半',
    judgment:'被困在魔塔的，是勇者剛娶進門的魔王。勇者還在找傳說之劍，公主已經把塔門拆下來、把魔王扛回勇者家門口，順便收了一筆搬運費。從此人稱「熊公主」。',
    chronicle:'勇者與魔王新婚，魔王卻又被困進魔塔。最後扛著塔門把人救回來的是公主，「熊公主」之名由此而來；勇者則把傳說之劍改造成了健身器材。'},
  {id:'tower-gallery',on:'L06:A',after:['L01:A'],when:f=>f.princess==='tower',title:'塔頂觀禮席',
    judgment:'公主仍被困在塔上，只能從窗口觀禮——新郎是勇者，新娘是王子當初救走的魔王。她把當天的營救費請款單折成紙飛機，準確射進了喜宴的禮金箱。',
    chronicle:'王子救走魔王、留下公主；後來魔王嫁給勇者，公主只能在塔頂觀禮，並把請款單折成紙飛機射進禮金箱。這是王國史上第一筆空投帳單。'},
  {id:'prince-saves-heros-spouse',on:'L01:A',after:['L06:A'],title:'王子救的是別人的另一半',
    judgment:'王子跳過被困的公主，救出了勇者的新婚伴侶魔王。勇者握著王子的手連聲道謝，公主在塔上看完全程，決定開始自學攀岩。',
    chronicle:'勇者娶了魔王，魔王後來又被困進塔裡，王子跳過公主、只救走勇者的伴侶。勇者寄來感謝卡，公主寄來請款單，王子兩封都沒拆。'},
  // ② 國王的副業與巨龍（L03 × L07）
  {id:'dragon-tester',on:'L07:B',after:['L03:B'],title:'皇家多角化經營',
    judgment:'國王白天餵龍、晚上開直播。他把巨龍拉進鏡頭當試用員，巨龍喝下魔藥打了個嗝，火焰把整批存貨燒光。國王宣布這叫「零庫存經營」。',
    chronicle:'國王先當上巨龍飼育員，後來又開直播賣魔藥，巨龍順理成章成為官方試用員。牠喝完魔藥打嗝噴火，燒光整批存貨，國王稱之為「零庫存經營」。'},
  {id:'unsold-feed',on:'L03:B',after:['L07:B'],title:'滯銷品的去處',
    judgment:'國王直播賣剩的魔藥堆滿倉庫，他親自餵龍時順手把滯銷品拌進飼料。巨龍打嗝噴火，把餵食台燒成了下一場直播的新背景。',
    chronicle:'國王直播賣藥失敗後，又被迫親自餵龍，於是把滯銷魔藥拌進龍飼料。巨龍一打嗝就噴火，國王的鬍子因此二度犧牲。'},
  {id:'burp-menu',on:'L07:A',after:['L03:A'],title:'餐飲衛生聯合稽查',
    judgment:'吃慣御膳的巨龍成了巫師的第一位客人。牠喝下打嗝魔藥，一嗝噴出整桌國王午餐的香氣，御膳房和巫師當場合作推出「吃飽必打嗝」套餐。',
    chronicle:'巨龍吃慣了國王的御膳，巫師則開始賣打嗝藥。兩項產業合推「吃飽必打嗝」套餐，衛生部要求標示副作用，廣告部堅持這就是賣點。'},
  {id:'burping-dragon',on:'L03:A',after:['L07:A'],title:'龍焰布丁',
    judgment:'全城喝了打嗝藥之後，連巨龍都跟風買了一瓶。御廚端上國王的午餐，巨龍邊吃邊打嗝，把甜點烤成了焦糖布丁，還要求下次照做。',
    chronicle:'打嗝藥流行全城後，巨龍也喝了一瓶。牠吃國王午餐時一路打嗝，把甜點烤成焦糖布丁，御膳房從此多了一道「龍焰布丁」。'},
  // ③ 王子的執法履歷與侍衛（L02 × L05、L02 × L08）
  {id:'prince-resume',on:'L05:B',after:['L02:B'],title:'王子的全能履歷',
    judgment:'王子拿出上次抓小偷用的手銬，熟練地銬住父王。他在處罰清單上註明「執法經驗：一次」，國王問他能不能先去找份正職。',
    chronicle:'王子先替侍衛追小偷，後來又親自處罰國王，於是把兩次事蹟寫成履歷，自稱「執法、司法、孝親三棲人才」。國王看完只問：「你能先出去工作嗎？」'},
  {id:'prince-streak',on:'L02:B',after:['L05:B'],title:'執法上癮',
    judgment:'處罰完父王之後，王子的執法熱情一直沒退。侍衛們一喊腰痛，他就戴著那頂紙囚帽衝出去追小偷，追到第三條街才想起來，這次的犯人不是他爸。',
    chronicle:'王子處罰過父王之後執法上癮，侍衛一推託，他就戴著紙囚帽親自追賊。王國從此流傳一句話：「被王子抓，至少帽子是現成的。」'},
  {id:'guards-overtime',on:'L08:B',after:['L02:A'],title:'沒人肯付的警察加班費',
    judgment:'王子剛掏出私房錢，侍衛長就遞上抓小偷那晚的加班費申請單。財政部判定：既然王子有錢給公主，警備預算也由王子負擔。',
    chronicle:'侍衛長抓到小偷後申請加班費，財政部發現王子還有錢給公主，便把警備預算一併轉給王子。王子宣布要去當小偷，至少還有機會拿回一點。'},
  {id:'self-funded-arrest',on:'L02:A',after:['L08:B'],title:'自費破案',
    judgment:'王子的私房錢已經全給了公主，連抓賊懸賞都付不出來。侍衛長只好自費加班把小偷抓回來，順便查出贓物裡有一張王子的欠條。',
    chronicle:'王子的私房錢先被拿去給公主，後來金庫失竊時連懸賞都付不起，侍衛長只好自費破案。贓物清單的最後一項，是王子的欠條。'},
  // ④ 被詐騙的國庫（L04:B × L06、L08）
  {id:'half-chest',on:'L08:A',after:['L04:B'],title:'半箱金幣',
    judgment:'國王把金幣箱交給公主，開箱才發現只剩一半——另一半早就當成「誠信保證金」匯給了魔王。公主收下半箱金幣，外加一張魔王寄來的「恭喜中獎」通知。',
    chronicle:'國王先把半箱金幣匯給魔王當保證金，後來才把剩下的半箱交給公主。公主的建設只完成了一半，另一半掛著「待魔王退款」的牌子。'},
  {id:'really-broke-king',on:'L08:B',after:['L04:B'],title:'國王真的沒錢',
    judgment:'國王這次說「一毛不出」不是小氣：箱裡的金幣早就匯給魔王當保證金了。王子掏出私房錢時，國王還順手請他幫忙寫信催魔王退款。',
    chronicle:'國王的金幣已被魔王騙走，只好讓王子自掏腰包給公主。王子付完錢還得替父王寫催款信，收件人是魔王，回信是一張抽獎券。'},
  {id:'refund-as-betrothal',on:'L06:B',after:['L04:B'],title:'退款變聘金',
    judgment:'魔王終於把國王匯去的保證金還回來了——以「聘金」的名義。國王收下自己的錢，還得對新女婿說謝謝。',
    chronicle:'國王先把保證金匯給魔王，後來魔王娶了公主，把同一筆錢當成聘金送回王宮。國王收下自己的錢還得道謝，財政部把這筆帳記為「親情循環」。'},
  {id:'in-law-scam',on:'L04:B',after:['L06:B'],title:'女婿的投資機會',
    judgment:'國王相信的不是一般的魔王，而是自己的女婿。他把一筆保證金匯給「自家人」，隔天收到女婿寄來的「恭喜中獎」通知。公主表示不想介入家務事。',
    chronicle:'魔王成為王室女婿後，國王對這位自家人深信不疑，匯出一筆保證金。女婿回寄「恭喜中獎」，公主表示這是她爸跟她老公之間的事。'},
  {id:'borrowed-from-princess',on:'L04:B',after:['L08:A'],title:'向女兒借錢被騙',
    judgment:'國王的金幣早已送給公主，為了向魔王表達誠信，他向公主借了建設基金匯過去。公主的工程因此少蓋了一層，空著的那層叫做「國王的誠信樓層」。',
    chronicle:'國王先把金幣送給公主，後來又向她借錢匯給魔王當保證金，結果被騙。公主的建築少蓋了一層，空著的那層被命名為「國王的誠信樓層」。'},
  // ⑤ 神殿立場（L04:A × L06）
  {id:'priest-officiant',on:'L06:A',after:['L04:A'],title:'神殿喜獲一位新主管',
    judgment:'早就宣布魔王比國王可信的祭司，自告奮勇擔任證婚人，並在台上宣誓終身效忠新人。隔天他的職稱變成「魔界教務長」，薪水是無限供應的喜糖。',
    chronicle:'祭司既然信任魔王，就順理成章為魔王與勇者證婚，並當場宣誓效忠。隔天他的職稱變成「魔界教務長」，待遇只有無限供應的喜糖。'},
  {id:'priest-miracle',on:'L06:B',after:['L04:A'],title:'神殿的婚姻認證',
    judgment:'支持魔王的祭司宣布這場婚禮是神蹟：「連魔王都成了王室的人，可見我早就是對的。」神殿連夜把他之前寫的〈王室不可信〉論文改列機密。',
    chronicle:'原本支持魔王的祭司，等到魔王成為王室女婿，立即宣布此為神蹟，卻忘了自己不久前才寫過〈王室不可信〉的論文；神殿現在把那篇論文列為機密。'},
  {id:'priest-hero-household',on:'L04:A',after:['L06:A'],title:'勇者家屬比較可信',
    judgment:'祭司的理由很簡單：「魔王都已經嫁給勇者了，品格有人擔保；國王卻連自己的遺囑都沒寫標點。」神殿當天就替勇者家掛上「誠信之家」的牌匾。',
    chronicle:'魔王嫁給勇者之後，祭司以「勇者擔保」為由宣布魔王比國王可信，並替勇者家掛上「誠信之家」牌匾。勇者表示自己只是結了個婚。'},
  {id:'son-in-law-over-king',on:'L04:A',after:['L06:B'],title:'女婿比岳父可信',
    judgment:'祭司宣布：同樣是王室成員，女婿魔王比岳父國王可信。這份聲明讓王宮的家族群組安靜了整整三天。',
    chronicle:'公主嫁給魔王後，祭司公開宣布「女婿比岳父可信」。王宮家族群組因此沉默三天，第四天唯一的訊息，是國王傳的一張貼圖。'},
  // ⑥ 罰單、帶貨與破產（L05 × L07 × L08）
  {id:'livestream-for-fine',on:'L07:B',after:['L05:A'],title:'帶貨繳罰單',
    judgment:'國王賣魔藥是有原因的：大臣開的罰單還沒繳。他在直播開頭先展示罰單，喊出「每賣一瓶，朕就離守法近一步」，結果鬍子先炸了。',
    chronicle:'國王先被大臣依法開罰，為了繳罰款親自開直播賣魔藥。罰款沒繳清，鬍子先炸掉，大臣又補開一張「直播危害公共安全」罰單。'},
  {id:'unlicensed-sale',on:'L05:A',after:['L07:B'],title:'無照販售',
    judgment:'大臣開給國王的罰單有明確理由：未經許可在城門口販售魔藥。國王抗議「法律是朕訂的」，大臣翻開法典：「是，連藥事法也是。」',
    chronicle:'國王先在城門口直播賣魔藥，後來被大臣以「無照販售」開罰。國王抗議法律是他訂的，大臣回答：連藥事法也是。'},
  {id:'fine-then-gift',on:'L08:A',after:['L05:A'],title:'最高權力與最低餘額',
    judgment:'國王剛繳完罰單，又把箱裡剩下的金幣全送給公主。財政官宣布國庫帳目完全平衡——因為已經沒有東西可以不平衡了。',
    chronicle:'國王前腳被大臣罰款，後腳又把剩下的金幣送給公主。財政官宣布國庫帳目完全平衡，因為他已經把「罰款」和「送禮」都列為精神資產。'},
  {id:'gift-then-fine',on:'L05:A',after:['L08:A'],title:'罰款付不出來',
    judgment:'大臣開完罰單才發現：國王的金幣已經全數送給公主。國王只好向公主申請分期付款，成為王國史上第一位向女兒欠債的君主。',
    chronicle:'國王先把金幣全送給公主，後來被大臣罰款時已身無分文，只好向公主申請分期。他成了王國史上第一位向女兒欠債的君主。'},
  {id:'prince-bailout',on:'L08:B',after:['L07:B'],title:'太子救市計畫',
    judgment:'國王直播賣藥的退款還沒處理完，自然一毛不出。王子掏出私房錢給公主時，國王順手把一疊退款單也塞進他手裡。',
    chronicle:'國王直播賣藥失利，轉頭宣布王子必須自掏腰包。王子從此成為皇室唯一有收入的人，薪水卻一分不剩，王國開創了「皇室親子訂閱制」。'},
  {id:'relay-bankruptcy',on:'L07:B',after:['L08:B'],title:'親子接力破產',
    judgment:'王子的私房錢已經全給了公主，國王只好親自下海賣藥補貼家用。直播標題是「太子破產，父王救市」，第一則留言是王子打的一星。',
    chronicle:'王子先自掏腰包給公主，國王接著親自開直播賣藥救家計。王子留下一星負評，隨即被父王以叛國論處——這是王國第一起家庭內部的叛國案。'},
  // 公主的金幣與所在位置（L01 × L08）
  {id:'tower-basket',on:'L08:A',after:['L01:A'],when:f=>f.princess==='tower',title:'吊籃金庫',
    judgment:'公主還被困在塔上，國王只好用吊籃把金幣一袋袋送上去。公主再用同一個吊籃把建材一塊塊放下來，遙控蓋好了圖書館。',
    chronicle:'公主一直被困在塔上，收下金幣時用的是吊籃；她又用同一個吊籃遙控蓋好了圖書館。王子至今仍不知道該從哪裡上塔。'},
  {id:'trapped-with-gold',on:'L01:A',after:['L08:A'],title:'帶著金幣被困',
    judgment:'公主帶著那箱金幣去魔塔勘查圖書館預定地，結果跟魔王一起被困住。王子只救走魔王，理由是「公主連同金幣箱太重，比較難扛」。',
    chronicle:'公主拿到金幣後去魔塔勘查圖書館預定地，卻和魔王一起被困。王子只救走魔王，理由是金幣箱太重；公主索性在塔頂開了全國最高的圖書館。'},
  {id:'bear-gym',on:'L08:A',after:['L01:B'],title:'公主的新國策',
    judgment:'熊公主一拿到金幣，就宣布圖書館改建成免費健身房，門口標語是「救國不用等王子」。',
    chronicle:'熊公主用金幣成立免費健身房，門口掛著「救國不用等王子」。國民體能提升，王子則請病假三個月，理由是看到啞鈴會頭暈。'},
  {id:'weighted-rescue',on:'L01:B',after:['L08:A'],title:'負重訓練',
    judgment:'公主是扛著剛拿到的那箱金幣上塔的——她說這是負重訓練。她把魔王連同王座搬下塔時，金幣箱還夾在腋下，「熊公主」之名當天傳遍全國。',
    chronicle:'公主拿到金幣後，扛著整箱金幣當負重上塔救魔王，「熊公主」之名由此傳開。之後她把金幣改投入健身房，標語是「救國不用等王子」。'},
];

/* Court briefing shown BEFORE stamping. Only past facts, never this decree's outcomes. */
const BRIEFINGS = [
  {about:'L06:B',stage:'L01',when:f=>f.demonSpouse==='princess',text:'公主與魔王新婚第三天，兩人回魔塔搬行李，結果魔塔的門又卡住了。'},
  {about:'L06:A',stage:'L01',when:f=>f.demonSpouse==='hero',text:'勇者的新婚伴侶魔王回魔塔收拾嫁妝，塔門又卡住了；勇者還在找他的傳說之劍。'},
  {about:'L08:A',stage:'L01',when:f=>f.princessGold,text:'公主帶著金幣箱去魔塔勘查圖書館預定地，至今還沒有回來。'},
  {about:'L05:B',stage:'L02',when:f=>f.princeDeeds.includes('punish'),text:'處罰完父王之後，王子的執法熱情一直沒有退燒。'},
  {about:'L08:B',stage:'L02',when:f=>f.princeBroke,text:'王子的私房錢見底，最近對任何懸賞公告都特別關心。'},
  {about:'L07:B',stage:'L03',when:f=>f.kingJobs.includes('potion'),text:'國王直播賣剩的魔藥堆滿了倉庫，倉庫隔壁就是龍舍。'},
  {about:'L07:A',stage:'L03',when:f=>f.burpPotion,text:'全城都在打嗝，巨龍聞到御膳房的味道，也跟著打了一個。'},
  {about:'L06:B',stage:'L04',when:f=>f.demonSpouse==='princess',text:'魔王已經是王室女婿，每天準時進宮向岳父問安。'},
  {about:'L06:A',stage:'L04',when:f=>f.demonSpouse==='hero',text:'魔王嫁給勇者之後，逢人就說自己「已經從良」。'},
  {about:'L08:A',stage:'L04',when:f=>f.princessGold,text:'國王的金幣都送給公主了，手邊只剩公主工程的建設基金帳本。'},
  {about:'L02:B',stage:'L05',when:f=>f.princeDeeds.includes('thief'),text:'王子抓過一次小偷後，手銬一直掛在腰間，說是怕手生。'},
  {about:'L07:B',stage:'L05',when:f=>f.kingJobs.includes('potion'),text:'國王在城門口賣藥的影片，已經被大臣們轉傳了三輪。'},
  {about:'L08:A',stage:'L05',when:f=>f.princessGold,text:'國王已經把金幣全送給了公主，身上只剩一頂王冠。'},
  {about:'L01:A',stage:'L06',when:f=>f.princess==='tower',text:'公主仍被困在塔上，停戰婚約的副本已經用吊籃送到她窗口。'},
  {about:'L01:B',stage:'L06',when:f=>f.bearPrincess,text:'魔王被熊公主扛出魔塔之後，逢人就打聽她的近況。'},
  {about:'L04:A',stage:'L06',when:f=>f.priestDemonist,text:'祭司已經替魔王寫好祝福詞，只差不知道新人是誰。'},
  {about:'L04:B',stage:'L06',when:f=>f.kingScammed,text:'國王還在追討匯給魔王的保證金，魔王回信：「辦完喜事再一起算。」'},
  {about:'L05:A',stage:'L07',when:f=>f.kingFined,text:'國王的罰單還沒繳，催繳通知已經寄到第三張。'},
  {about:'L08:B',stage:'L07',when:f=>f.princeBroke,text:'王子的私房錢已經見底，皇室再也找不到人贊助。'},
  {about:'L03:B',stage:'L07',when:f=>f.kingJobs.includes('dragon'),text:'國王每天餵完龍才上朝，袍子焦了三件，國庫依然見底。'},
  {about:'L03:A',stage:'L07',when:f=>f.dragonGourmet,text:'巨龍吃慣了御膳，最近開始挑食。'},
  {about:'L04:B',stage:'L08',when:f=>f.kingScammed,text:'國王面前這箱金幣，其實有一半已經匯給了魔王。'},
  {about:'L01:A',stage:'L08',when:f=>f.princess==='tower',text:'公主還被困在塔上，要領東西只能用吊籃。'},
  {about:'L05:A',stage:'L08',when:f=>f.kingFined,text:'罰單與金幣箱擺在同一張桌上，國王盯著兩者看了很久。'},
  {about:'L07:B',stage:'L08',when:f=>f.kingJobs.includes('potion'),text:'直播退款單就堆在金幣箱旁邊。'},
  {about:'L02:A',stage:'L08',when:f=>f.guardsGlory,text:'侍衛長的抓賊加班費申請單，也送到了同一張桌上。'},
];
/* Aftermath of the most recent decree, phrased against the CURRENT world. */
const RIPPLES = {
  'L01:A':f=>f.demonSpouse==='princess'?'新娘被留在塔上，新郎每天在塔下唱情歌，王子負責收門票。':'公主仍被困在高塔上，每天從窗口垂下一張新的營救費請款單。',
  'L01:B':()=>'熊公主今天又順手搬走一道卡住的城門，工部考慮把她列為重型機具。',
  'L02:A':()=>'侍衛長把抓賊照片掛滿走廊；王子在每張照片角落都貼了自己的大頭貼。',
  'L02:B':()=>'王子追賊時跑掉的鞋子被侍衛隊列為「待歸檔證物」，至今沒有歸還。',
  'L03:A':()=>'國王改吃乾麵包已經第三天，御膳房門口貼著巨龍寫的五星好評。',
  'L03:B':()=>'國王上朝前得先去龍舍點名，朝會因此改到下午，龍袍上還有焦痕。',
  'L04:A':()=>'神殿門口掛上「誠信魔界」新招牌，信徒開始用魔王語禱告。',
  'L04:B':()=>'國王仍在等魔王退回保證金，每天派人去信箱查看三次。',
  'L05:A':()=>'國王的罰單貼在王座扶手上，他每次坐下都得先看一遍罰款金額。',
  'L05:B':()=>'那頂紙做的囚犯帽被收進皇家博物館，標籤寫著「孝親文物」。',
  'L06:A':()=>'勇者與魔王的新居門牌該寫「勇者家」還是「魔王城」，兩國外交部至今未定。',
  'L06:B':()=>'魔王成為王室女婿後每天準時進宮，順便問今天還要不要侵略。',
  'L07:A':()=>'全城都在打嗝；財政部仍在討論打嗝藥要不要課娛樂稅。',
  'L07:B':()=>'王室商店的一星負評被當成叛國證據，客服部只剩一張空椅子。',
  'L08:A':f=>f.princess==='tower'?'公主在塔頂用吊籃遙控圖書館工地，工人們每天仰著頭領薪水。'
    :f.bearPrincess?'熊公主的免費健身房開幕了，王子每天繞道上朝。'
    :'公主用金幣蓋的圖書館正在動工；王子每天去工地要求冠名。',
  'L08:B':()=>'王子的私房錢見底，開始在宮裡賣自己的簽名照補貼家用。',
};
const FIRST_BRIEFING='遺囑試辦第一天。國王精神很好，坐在第一排等著看自己的遺囑怎麼被執行。王國目前一切如常——這是最後一次。';

function decisionKey(entry){return `${entry.stageId}:${entry.choiceId}`;}
/* A "world" bundles one chapter's story rules. Chapter 1 is the default everywhere. */
const ROYAL_WORLD = Object.freeze({initial:INITIAL_FACTS,effects:WORLD_EFFECTS,chains:CHAINS,briefings:BRIEFINGS,ripples:RIPPLES,first:()=>FIRST_BRIEFING});
/**
 * Replays valid decisions in executed order. Returns final facts and per-step reactions.
 * `prelude` (optional) = valid history of the previous chapter: its facts and decision keys are
 * already true when this chapter starts, so cross-chapter chains can require them in `after`.
 */
function traceWorld(history,world=ROYAL_WORLD,prelude=[]){
  let facts=world.initial;const priorKeys=new Set();
  if(world!==ROYAL_WORLD){
    const earlier=traceWorld(prelude);
    facts={...earlier.facts,...world.initial};
    for(const s of earlier.steps)priorKeys.add(s.key);
  }
  const steps=[];
  for(const entry of history??[]){
    if(!entry?.valid)continue;
    const key=decisionKey(entry);
    if(priorKeys.has(key))continue; // a decision can only be executed once
    const reactions=world.chains.filter(c=>c.on===key&&c.after.every(k=>priorKeys.has(k))&&(!c.when||c.when(facts)));
    const before=facts;
    facts=world.effects[key]?world.effects[key](facts):facts;
    steps.push({key,before,after:facts,reactions});
    priorKeys.add(key);
  }
  return {facts,steps,priorKeys};
}
/** Reactions to show on the judgment screen for the decision just stamped. */
function latestReactions(history,world=ROYAL_WORLD,prelude=[]){
  const last=history?.at(-1);
  if(!last?.valid)return [];
  const step=traceWorld(history,world,prelude).steps.at(-1);
  return step&&step.key===decisionKey(last)?step.reactions:[];
}
/** Up to two neutral briefing lines for the stage about to be punctuated. */
function courtBriefing(history,stageId,world=ROYAL_WORLD,prelude=[]){
  const {facts,steps}=traceWorld(history,world,prelude);
  const picked=world.briefings.filter(b=>b.stage===stageId&&b.when(facts)).slice(0,2);
  // Opening line of a chapter; a later chapter may also carry one note from the previous chapter.
  if(!steps.length)return [world.first(facts,prelude),...picked.slice(0,1).map(b=>b.text)];
  const lines=picked.map(b=>b.text),lastKey=steps.at(-1).key;
  // Add the latest decision's aftermath unless a stage note already covers that decision.
  if(lines.length<2&&!picked.some(b=>b.about===lastKey)){
    const ripple=world.ripples[lastKey]?.(facts);
    if(ripple)lines.push(ripple);
  }
  return lines;
}
export {INITIAL_FACTS,WORLD_EFFECTS,CHAINS,BRIEFINGS,RIPPLES,FIRST_BRIEFING,ROYAL_WORLD,decisionKey,traceWorld,latestReactions,courtBriefing};
