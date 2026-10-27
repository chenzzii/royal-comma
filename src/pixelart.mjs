// v4.7: 8-bit vector illustrations for chapter 1 outcomes.
// Every scene is drawn on a 96×56 pixel buffer, then emitted as an SVG of merged horizontal runs
// (crisp edges, no external assets, safe for the single offline HTML build).
const ART_W = 96, ART_H = 56, FLOOR = 50;
const PAL = {
  K:'#2b1d1a', k:'#5a4636', S:'#f2c79b', s:'#d9a074', Y:'#f4c542', y:'#b8862b', R:'#c4373b', r:'#7e1f2a',
  B:'#3e6fb5', b:'#7a4a2a', P:'#e88aa8', p:'#b4517a', V:'#6b3fa0', v:'#432466', G:'#4f9a4a', g:'#2f6b33',
  W:'#f7f1e3', w:'#c9c2b4', E:'#8a8a96', e:'#5d5d6b', O:'#ee8a2f', C:'#7fd0d8', H:'#3a2a20', L:'#e8d26a', N:'#1d1724'
};
function canvas(){ return {px:new Array(ART_W*ART_H).fill(null)}; }
function dot(cv,x,y,c){ if(x>=0&&y>=0&&x<ART_W&&y<ART_H&&c) cv.px[y*ART_W+x]=PAL[c]||c; }
function box(cv,x,y,w,h,c){ for(let j=0;j<h;j++)for(let i=0;i<w;i++)dot(cv,x+i,y+j,c); }
// grid sprite: rows of characters; '.' is transparent. flip mirrors horizontally.
function sprite(cv,rows,x,y,flip=false,swap={}){
  rows.forEach((row,j)=>{const w=row.length;for(let i=0;i<w;i++){const ch=row[i];if(ch!=='.')dot(cv,x+(flip?w-1-i:i),y+j,swap[ch]||ch);}});
}
function toSvg(cv,label){
  let out='';
  for(let y=0;y<ART_H;y++){let x=0;while(x<ART_W){const c=cv.px[y*ART_W+x];let n=1;while(x+n<ART_W&&cv.px[y*ART_W+x+n]===c)n++;if(c)out+=`<rect x="${x}" y="${y}" width="${n}" height="1" fill="${c}"/>`;x+=n;}}
  return `<svg class="pixel-scene" viewBox="0 0 ${ART_W} ${ART_H}" shape-rendering="crispEdges" role="img" aria-label="${label}">${out}</svg>`;
}

// ---- backgrounds ----
function dither(cv,y0,y1,a,b){ for(let y=y0;y<y1;y++)for(let x=0;x<ART_W;x++)dot(cv,x,y,(x+y)%2?a:b); }
const BACKDROPS = {
  hall(cv){ box(cv,0,0,ART_W,FLOOR,'#5b3a3f'); for(let y=4;y<FLOOR;y+=7)for(let x=(y/7%2)*6;x<ART_W;x+=12)box(cv,x,y,11,1,'#4a2e33');
    box(cv,10,6,8,16,'#3b2a4a');box(cv,78,6,8,16,'#3b2a4a');box(cv,11,7,6,14,'#8fb3d9');box(cv,79,7,6,14,'#8fb3d9');box(cv,13,7,2,14,'#c9dcf0');box(cv,81,7,2,14,'#c9dcf0');
    box(cv,0,FLOOR,ART_W,ART_H-FLOOR,'#6e5a4a');box(cv,30,FLOOR,36,ART_H-FLOOR,'R');box(cv,30,FLOOR,36,1,'r'); },
  sky(cv){ box(cv,0,0,ART_W,20,'#7cc4e8');dither(cv,20,26,'#7cc4e8','#a9dcf0');box(cv,0,26,ART_W,FLOOR-26,'#a9dcf0');
    box(cv,8,8,10,3,'W');box(cv,6,9,14,2,'W');box(cv,64,5,12,3,'W');box(cv,61,6,18,2,'W');
    for(let x=0;x<ART_W;x+=2)dot(cv,x,FLOOR-1-(x%6===0?1:0),'G');box(cv,0,FLOOR,ART_W,ART_H-FLOOR,'G');dither(cv,FLOOR+3,ART_H,'G','g'); },
  night(cv){ box(cv,0,0,ART_W,FLOOR,'#1e2346');dither(cv,30,FLOOR,'#1e2346','#2c3363');
    [[5,4],[19,10],[33,3],[50,8],[67,2],[83,9],[90,3],[42,15],[12,18]].forEach(([x,y])=>dot(cv,x,y,'L'));box(cv,76,4,5,5,'L');box(cv,78,4,3,3,'#1e2346');
    box(cv,0,FLOOR,ART_W,ART_H-FLOOR,'#3b3a4f');dither(cv,FLOOR+2,ART_H,'#3b3a4f','#2c2b3d'); },
  street(cv){ box(cv,0,0,ART_W,FLOOR,'#e9c99a');
    [[0,'#c98f63'],[24,'#b07a54'],[50,'#c98f63'],[74,'#a8704c']].forEach(([x,c])=>{box(cv,x,12,22,FLOOR-12,c);box(cv,x,8,22,4,'r');box(cv,x+4,20,5,6,'#5a7fa8');box(cv,x+13,20,5,6,'#5a7fa8');box(cv,x+8,36,6,FLOOR-36,'H');});
    box(cv,0,FLOOR,ART_W,ART_H-FLOOR,'E');for(let x=0;x<ART_W;x+=6)box(cv,x,FLOOR+2,4,1,'e'); },
  kitchen(cv){ box(cv,0,0,ART_W,FLOOR,'#d8c3a0');for(let y=0;y<30;y+=5)for(let x=(y/5%2)*4;x<ART_W;x+=8)box(cv,x,y,7,4,'#cbb38d');
    box(cv,0,30,ART_W,FLOOR-30,'#b9946a');box(cv,0,30,ART_W,1,'b');box(cv,0,FLOOR,ART_W,ART_H-FLOOR,'#7a5a43');for(let x=0;x<ART_W;x+=8)box(cv,x,FLOOR,1,ART_H-FLOOR,'#5e4433'); },
  chapel(cv){ BACKDROPS.hall(cv); box(cv,40,4,16,20,'#3b2a4a');box(cv,41,5,14,18,'P');box(cv,47,5,2,18,'W');box(cv,41,12,14,2,'W');
    box(cv,30,FLOOR,36,ART_H-FLOOR,'W');box(cv,30,FLOOR,36,1,'w'); }
};

// ---- characters (10 wide, feet on baseY) ----
const ROLES = {
  king:{body:'R',trim:'Y',hat:'crown',hair:'W',beard:true},
  prince:{body:'B',trim:'Y',hat:'coronet',hair:'y'},
  princess:{body:'P',trim:'W',hat:'tiara',hair:'Y',long:true,dress:true},
  demon:{body:'V',trim:'v',hat:'horns',hair:'N',skin:'#b9a6d9',cape:'r'},
  guard:{body:'E',trim:'e',hat:'helmet',hair:'H'},
  thief:{body:'N',trim:'k',hat:'mask',hair:'N'},
  chef:{body:'W',trim:'w',hat:'chef',hair:'b'},
  priest:{body:'W',trim:'Y',hat:'mitre',hair:'w',dress:true},
  minister:{body:'G',trim:'Y',hat:'cap',hair:'E',beard:true},
  hero:{body:'C',trim:'E',hat:'helmet2',hair:'b'},
  wizard:{body:'V',trim:'Y',hat:'wizard',hair:'w',beard:true,dress:true}
};
function person(cv,role,x,baseY,o={}){
  const r={...ROLES[role],...o},f=o.flip,sk=r.skin||'S';
  const P=(dx,dy,c)=>dot(cv,x+(f?9-dx:dx),baseY+dy,c);
  const R=(dx,dy,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)P(dx+i,dy+j,c);};
  if(r.cape)R(1,-9,8,8,r.cape);
  if(r.long){R(1,-14,1,7,r.hair);R(8,-14,1,7,r.hair);}
  // legs & body
  R(3,-2,1,2,'K');R(6,-2,1,2,'K');
  if(r.dress){R(2,-8,6,3,r.body);R(1,-5,8,3,r.body);R(1,-3,8,1,r.trim);R(3,-1,1,1,'K');R(6,-1,1,1,'K');}
  else{R(2,-8,6,6,r.body);R(2,-4,6,1,r.trim);R(4,-8,2,1,r.trim);}
  // arms
  const arm=(dx,up)=>{ if(up){R(dx,-12,1,4,r.body);P(dx,-13,sk);} else {R(dx,-8,1,4,r.body);P(dx,-4,sk);} };
  arm(1,o.armsUp||o.leftUp); arm(8,o.armsUp||o.armUp);
  // head
  R(2,-14,6,6,sk);R(2,-15,6,1,r.hair);P(2,-14,r.hair);P(7,-14,r.hair);
  const face=o.face||'happy';
  P(3,-12,'K');P(6,-12,'K');
  if(face==='angry'){P(3,-13,'K');P(6,-13,'K');}
  if(face==='happy'){P(4,-10,'K');P(5,-10,'K');P(3,-11,'s');}
  if(face==='sad'){P(4,-10,'K');P(5,-10,'K');P(3,-10,'K');P(6,-10,'K');P(6,-11,'C');}
  if(face==='shock'){P(4,-10,'K');P(5,-10,'K');P(4,-9,'K');P(5,-9,'K');}
  if(face==='flat'){P(4,-10,'K');P(5,-10,'K');P(6,-10,'K');}
  if(r.beard){R(2,-10,6,2,'W');R(3,-8,4,1,'W');if(face!=='flat')P(4,-10,'K'),P(5,-10,'K');}
  // headwear
  const H={
    crown(){R(2,-16,6,1,'Y');P(2,-17,'Y');P(4,-17,'Y');P(5,-17,'Y');P(7,-17,'Y');P(4,-16,'R');},
    coronet(){R(3,-16,4,1,'Y');P(3,-17,'Y');P(6,-17,'Y');},
    tiara(){P(4,-16,'Y');P(5,-16,'Y');P(4,-17,'C');},
    horns(){P(1,-15,'W');P(1,-16,'W');P(0,-17,'W');P(8,-15,'W');P(8,-16,'W');P(9,-17,'W');},
    helmet(){R(2,-17,6,3,'E');R(2,-14,1,2,'E');R(7,-14,1,2,'E');P(4,-18,'R');P(5,-18,'R');P(5,-19,'R');},
    helmet2(){R(2,-17,6,3,'C');R(2,-14,1,3,'C');R(7,-14,1,3,'C');P(5,-18,'Y');},
    mask(){R(2,-12,6,1,'N');P(3,-12,'W');P(6,-12,'W');},
    chef(){R(2,-17,6,2,'W');R(1,-20,8,3,'W');R(2,-21,6,1,'W');R(2,-17,6,1,'w');},
    mitre(){R(3,-17,4,2,'W');R(4,-19,2,2,'W');P(4,-18,'Y');P(5,-18,'Y');P(4,-17,'Y');},
    cap(){R(2,-17,6,2,'k');P(8,-16,'k');},
    wizard(){R(1,-16,8,1,'V');R(2,-17,6,1,'V');R(3,-18,4,1,'V');R(4,-19,2,1,'V');P(5,-20,'V');P(6,-21,'V');P(4,-17,'Y');},
    paper(){R(2,-16,6,1,'W');R(3,-17,4,1,'W');R(4,-18,2,1,'W');P(4,-19,'W');P(4,-17,'K');}
  };
  (H[o.hat||r.hat]||(()=>{}))();
  if(o.apron){R(3,-7,4,5,'W');R(3,-7,4,1,'w');}
}

// ---- props ----
const SPR = {
  chest:['.KKKKKKKK.','KbbbbbbbbK','KbYYbbYYbK','KKKKKKKKKK','KbbbYYbbbK','KbbbYYbbbK','KbbbbbbbbK','KKKKKKKKKK'],
  coins:['..YY.YY..','.YYYYYYY.','YYyYYYyYY'],
  potion:['..b..','..W..','.WCW.','WPPPW','WPPPW','WPPPW','.WWW.'],
  scroll:['.WWWWWW.','bWkkkkWb','.WWWWWW.','bWkkkkWb','.WWWWWW.'],
  ticket:['.RRRRRR.','rRWWWWRr','.RRRRRR.','rRWWWWRr','.RRRRRR.'],
  heart:['RR.RR','RRRRR','.RRR.','..R..'],
  bigheart:['.RR.RR.','RRRRRRR','RRRRRRR','.RRRRR.','..RRR..','...R...'],
  bang:['R','R','R','.','R'],
  quest:['RRR','..R','.RR','...','.R.'],
  sweat:['.C.','CCC','.C.'],
  star:['..L..','.LLL.','LLWLL','.LLL.','..L..'],
  burst:['....O....','.O..O..O.','..OOYOO..','..OYYYO..','OOYYWYYOO','..OYYYO..','..OOYOO..','.O..O..O.','....O....'],
  drumstick:['..WW','.bbW','bbb.','bb..'],
  plate:['.WWWWWW.','wWWWWWWw'],
  cake:['..R...','.WWWW.','PPPPPP','WWWWWW'],
  slip:['WWWW','WkkW','WWWW','WkkW','WWWW'],
  piggy:['.PPPPP.','PPKPPPPP','PPPPPPPp','.PPPPPP.','.p..p...'],
  camera:['.EE...','NNNNNN','NWWNEN','NNNNNN'],
  clock:['.KKKKK.','KWWKWWK','KWWKWWK','KWWKKWK','KWWWWWK','.KKKKK.'],
  bubble:['.WWWWWWW.','WWWWWWWWW','WWWWWWWWW','WWWWWWWWW','WWWWWWWWW','.WWWWWWW.','..WW.....','.W.......'],
  throne:['.YY....YY.','.YRRRRRRY.','.YRRRRRRY.','.YRRRRRRY.','.YRRRRRRY.','YYYYYYYYYY','YRRRRRRRRY','YYYYYYYYYY','.Y......Y.','.Y......Y.','.Y......Y.'],
  door:['eEEEEEEEEEe','eEeEEEEEeEe','eEEEEEEEEEe','eEEEeEEEEEe','eEEEEEEEEEe','eeeeeeeeeee'],
  sign:['bbbbbbbbb','bWRWWWRWb','bWWRWRWWb','bWWWRWWWb','bWWRWRWWb','bWRWWWRWb','bbbbbbbbb','....b....','....b....','....b....'],
  table:['bbbbbbbbbbbbbbbb','HHHHHHHHHHHHHHHH','.H............H.','.H............H.','.H............H.'],
  dragon:[
    '..........gg..............','.........gGGg.............','....gg..gGGGGg............','...gGGg.gGWKGGg...........',
    '..gGGGGggGGGGGGg..........','..gGGGGGgGGGGGGGGgg.......','...gGGGGgGGGGGGGGGGg......','....gggggGGGGWRWRGGg......',
    '........gGGGGGGGGGg.......','.......gGGYYYYGGGg........','......gGGYYYYYYGGGg.....gg','.....gGGYYYYYYYYGGGg...gGg',
    '.....gGGYYYYYYYYGGGGgggGg.','.....gGGYYYYYYYYGGGGGGGg..','......gGGYYYYYYGGGGgggg...','.......gGGGGGGGGGGg.......',
    '.......gGGg...gGGg........','......ggggg..ggggg........'],
  poster:['WWWWWWWWWW','WVVVVVVVVW','WVWVVVVWVW','WVVVVVVVVW','WVVKVVKVVW','WVVVVVVVVW','WVVKKKKVVW','WVVVVVVVVW','WWWWWWWWWW','WWRRWRRWWW','WWWRRRWWWW','WWWWRWWWWW'],
  arch:null
};
const put=(cv,name,x,y,flip,swap)=>sprite(cv,SPR[name],x,y,flip,swap);
function tower(cv,x){ box(cv,x,6,18,FLOOR-6,'E');for(let y=8;y<FLOOR;y+=4)for(let i=(y/4%2)*3;i<18;i+=6)box(cv,x+i,y,5,1,'e');
  for(let i=0;i<18;i+=4)box(cv,x+i,3,3,3,'E');box(cv,x+5,14,8,9,'N');box(cv,x+5,14,8,1,'e'); }
function arch(cv,x,w){ box(cv,x,14,3,FLOOR-14,'W');box(cv,x+w-3,14,3,FLOOR-14,'W');box(cv,x,11,w,3,'W');box(cv,x+2,9,w-4,2,'W');
  for(let i=0;i<w;i+=4){dot(cv,x+i,12,'P');dot(cv,x+i+1,10,'p');}for(let y=16;y<FLOOR;y+=5){dot(cv,x+1,y,'P');dot(cv,x+w-2,y,'P');} }

// ---- 16 scenes ----
const SCENES = {
  'L01:A':cv=>{BACKDROPS.night(cv);tower(cv,6);person(cv,'princess',10,36,{face:'angry'});put(cv,'bang',13,13);
    put(cv,'throne',70,FLOOR-11);person(cv,'demon',49,FLOOR,{face:'shock'});person(cv,'prince',38,FLOOR,{armUp:true});put(cv,'bigheart',42,24);put(cv,'quest',54,30);},
  'L01:B':cv=>{BACKDROPS.night(cv);tower(cv,74);put(cv,'door',75,FLOOR-14,false);
    person(cv,'princess',34,FLOOR,{armsUp:true,face:'angry'});put(cv,'throne',34,26);person(cv,'demon',34,31,{face:'shock',armsUp:true});put(cv,'sweat',46,22);
    person(cv,'prince',8,FLOOR,{face:'flat'});put(cv,'slip',20,38);put(cv,'slip',22,32);put(cv,'slip',18,26);put(cv,'sweat',6,30);},
  'L02:A':cv=>{BACKDROPS.street(cv);put(cv,'chest',74,FLOOR-8);person(cv,'guard',24,FLOOR,{armUp:true,face:'angry'});person(cv,'prince',36,FLOOR,{face:'happy',armsUp:true});person(cv,'thief',50,FLOOR-2,{face:'shock',armsUp:true,flip:true});
    put(cv,'camera',8,30);put(cv,'star',14,24);put(cv,'star',38,24);put(cv,'star',46,20);},
  'L02:B':cv=>{BACKDROPS.street(cv);person(cv,'thief',72,FLOOR,{face:'happy',flip:true});put(cv,'coins',74,FLOOR-21);
    person(cv,'prince',48,FLOOR,{face:'shock',armUp:true});put(cv,'quest',52,24);
    person(cv,'guard',6,FLOOR,{face:'sad'});person(cv,'guard',18,FLOOR,{face:'sad'});put(cv,'sweat',4,30);put(cv,'sweat',27,31);},
  'L03:A':cv=>{BACKDROPS.kitchen(cv);put(cv,'dragon',58,FLOOR-18,true);put(cv,'table',40,FLOOR-5);put(cv,'plate',42,FLOOR-7);put(cv,'drumstick',44,FLOOR-11);put(cv,'cake',50,FLOOR-9);
    person(cv,'chef',26,FLOOR,{armUp:true});person(cv,'king',6,FLOOR,{face:'sad'});put(cv,'plate',6,FLOOR-17);put(cv,'bubble',68,6);put(cv,'cake',69,7);},
  'L03:B':cv=>{BACKDROPS.kitchen(cv);put(cv,'dragon',56,FLOOR-18,true);person(cv,'king',40,FLOOR,{apron:true,armUp:true,face:'shock'});put(cv,'drumstick',50,FLOOR-17);
    put(cv,'bubble',66,6);put(cv,'star',68,7);put(cv,'bang',74,7);person(cv,'chef',6,FLOOR,{face:'happy',flip:true,leftUp:true});put(cv,'slip',18,30);put(cv,'heart',4,22);},
  'L04:A':cv=>{BACKDROPS.chapel(cv);put(cv,'poster',6,12);put(cv,'poster',80,12);put(cv,'poster',66,8);person(cv,'priest',42,FLOOR,{armsUp:true,face:'happy'});put(cv,'heart',43,24);
    person(cv,'king',20,FLOOR,{face:'shock'});put(cv,'bang',24,26);put(cv,'coins',60,FLOOR-3);},
  'L04:B':cv=>{BACKDROPS.hall(cv);person(cv,'king',30,FLOOR,{armUp:true,face:'happy'});put(cv,'chest',40,FLOOR-14);put(cv,'coins',40,FLOOR-17);
    person(cv,'demon',58,FLOOR,{face:'happy',flip:true,armUp:true});put(cv,'star',66,26);person(cv,'priest',8,FLOOR,{face:'shock'});put(cv,'quest',12,25);put(cv,'quest',16,22);},
  'L05:A':cv=>{BACKDROPS.hall(cv);put(cv,'throne',43,FLOOR-11);person(cv,'king',30,FLOOR,{face:'shock'});put(cv,'quest',33,24);
    person(cv,'minister',58,FLOOR,{flip:true,armUp:true,face:'flat'});put(cv,'ticket',48,32);person(cv,'prince',76,FLOOR,{face:'happy',flip:true});},
  'L05:B':cv=>{BACKDROPS.hall(cv);person(cv,'king',36,FLOOR,{hat:'paper',face:'shock'});put(cv,'quest',40,22);
    person(cv,'prince',52,FLOOR,{armUp:true,face:'happy',flip:true});put(cv,'heart',62,26);put(cv,'cake',66,FLOOR-4);person(cv,'minister',12,FLOOR,{face:'sad'});},
  'L06:A':cv=>{BACKDROPS.chapel(cv);arch(cv,30,36);person(cv,'hero',36,FLOOR,{armUp:true,face:'happy'});person(cv,'demon',49,FLOOR,{flip:true,face:'happy',leftUp:true});
    put(cv,'bigheart',45,18);put(cv,'chest',4,FLOOR-8);put(cv,'quest',8,FLOOR-15);person(cv,'king',80,FLOOR,{face:'shock',flip:true});},
  'L06:B':cv=>{BACKDROPS.chapel(cv);arch(cv,28,36);person(cv,'princess',34,FLOOR,{face:'happy',armUp:true});person(cv,'demon',48,FLOOR,{flip:true,face:'happy'});put(cv,'bigheart',41,18);
    person(cv,'hero',78,FLOOR,{flip:true,face:'flat',leftUp:true});put(cv,'scroll',72,30);put(cv,'sweat',88,28);},
  'L07:A':cv=>{BACKDROPS.street(cv);person(cv,'wizard',40,FLOOR,{armUp:true,face:'angry'});put(cv,'sign',54,FLOOR-24);person(cv,'king',72,FLOOR,{face:'happy',flip:true});
    put(cv,'potion',22,FLOOR-7);person(cv,'thief',8,FLOOR,{face:'shock',hat:'cap'});put(cv,'bubble',6,10);dot(cv,9,13,'C');box(cv,11,12,2,2,'C');dot(cv,13,14,'C');},
  'L07:B':cv=>{BACKDROPS.street(cv);box(cv,22,FLOOR-10,52,10,'b');box(cv,22,FLOOR-11,52,1,'Y');for(let i=0;i<6;i++)put(cv,'potion',26+i*8,FLOOR-18,false,{P:i%2?'G':'P'});
    person(cv,'king',44,FLOOR-10,{face:'shock',armUp:true});put(cv,'burst',43,FLOOR-30);put(cv,'coins',78,FLOOR-3);person(cv,'wizard',82,FLOOR,{flip:true,face:'happy'});},
  'L08:A':cv=>{BACKDROPS.hall(cv);put(cv,'chest',44,FLOOR-8);put(cv,'coins',44,FLOOR-11);person(cv,'princess',56,FLOOR,{flip:true,armsUp:true,face:'happy'});
    person(cv,'king',30,FLOOR,{face:'happy',armUp:true});box(cv,0,16,12,FLOOR-16,'H');person(cv,'prince',2,FLOOR,{face:'sad'});put(cv,'scroll',14,34);put(cv,'clock',4,6);},
  'L08:B':cv=>{BACKDROPS.hall(cv);person(cv,'king',8,FLOOR,{face:'flat',flip:true});put(cv,'quest',10,24,false,{R:'W'});
    person(cv,'prince',36,FLOOR,{armUp:true,face:'sad'});put(cv,'chest',46,FLOOR-14);put(cv,'piggy',26,FLOOR-6);put(cv,'sweat',33,30);
    person(cv,'princess',62,FLOOR,{flip:true,face:'happy',armsUp:true});put(cv,'heart',66,24);}
};
function sceneSvg(stageId,choiceId,label=''){
  const draw=SCENES[`${stageId}:${choiceId}`];
  if(!draw) return '';
  const cv=canvas();draw(cv);
  return toSvg(cv,String(label).replace(/[<>&"]/g,''));
}
const SCENE_KEYS=Object.keys(SCENES);
export {sceneSvg, SCENE_KEYS, ART_W, ART_H};
