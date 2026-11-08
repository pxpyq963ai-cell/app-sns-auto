// スライド生成：node gen.js <出力フォルダ> <種類> <引数...>
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const d = require('./dy.js');
const NAMES=['愚者','魔術師','女教皇','女帝','皇帝','法王','恋人','戦車','力','隠者','運命の輪','正義','吊るされた男','死神','節制','悪魔','塔','星','月','太陽','審判','世界'];
const BASE='file://'+__dirname+'/';
const TREE=(()=>{const P=[[50,6],[80,20],[20,20],[80,46],[20,46],[50,56],[80,76],[20,76],[50,86],[50,100]];
 const E=[[0,1],[0,2],[0,5],[1,2],[1,3],[1,5],[2,4],[2,5],[3,4],[3,5],[3,6],[4,5],[4,7],[5,6],[5,7],[5,8],[6,7],[6,8],[6,9],[7,8],[7,9],[8,9]];
 return `<svg viewBox="10 0 80 108" class="tree">${E.map(([a,b])=>`<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}"/>`).join('')}${P.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.2"/>`).join('')}</svg>`})();
const CSS=`<link rel="stylesheet" href="${BASE}node_modules/@fontsource/shippori-mincho/500.css"><link rel="stylesheet" href="${BASE}node_modules/@fontsource/shippori-mincho/700.css"><style>
*{box-sizing:border-box;margin:0;word-break:auto-phrase;text-wrap:balance}
body{width:1080px;height:1920px;overflow:hidden;font-family:'Shippori Mincho',serif;color:#f3ead2;
 background:radial-gradient(ellipse at 50% 0%,#3b2a7a 0%,#1d1640 45%,#0e0b22 100%);display:flex;flex-direction:column;align-items:center;padding:150px 80px 260px;position:relative}
.stars{position:absolute;inset:0;background-image:radial-gradient(2px 2px at 12% 18%,#fff8 50%,transparent 51%),radial-gradient(2px 2px at 82% 12%,#fff6 50%,transparent 51%),radial-gradient(1.5px 1.5px at 66% 42%,#fff5 50%,transparent 51%),radial-gradient(2px 2px at 25% 70%,#fff4 50%,transparent 51%),radial-gradient(1.5px 1.5px at 90% 80%,#fff6 50%,transparent 51%),radial-gradient(1.5px 1.5px at 40% 92%,#fff4 50%,transparent 51%)}
.gold{color:#e8c46a}.small{font-size:38px;letter-spacing:.12em;color:#c9b98f}
h1{font-size:96px;line-height:1.35;text-align:center;font-weight:700}
h2{font-size:70px;line-height:1.45;text-align:center;font-weight:700}
p{font-size:48px;line-height:1.75;text-align:center}
.back{width:270px;height:470px;border-radius:22px;border:4px solid #e8c46a;background:linear-gradient(160deg,#2c2266,#16113a);display:flex;align-items:center;justify-content:center;box-shadow:0 20px 60px #0008;position:relative}
.back .tree{width:150px}.tree line{stroke:#e8c46a;stroke-width:.7;opacity:.8}.tree circle{fill:#1d1640;stroke:#e8c46a;stroke-width:.9}
.num{position:absolute;bottom:-110px;font-size:80px;font-weight:700;color:#e8c46a}
.row{display:flex;gap:60px;margin:90px 0 150px}
.card{width:340px;border-radius:18px;border:5px solid #e8c46a;box-shadow:0 20px 70px #000a}
.rev{transform:rotate(180deg)}
.box{border:2px solid #e8c46a88;border-radius:28px;padding:44px 50px;background:#0e0b2299;width:100%}
.foot{position:absolute;bottom:70px;font-size:32px;color:#a99d80;letter-spacing:.08em;text-align:center;width:100%}
.mark{position:absolute;top:60px;font-size:34px;letter-spacing:.2em;color:#e8c46a}
.sp{flex:1}
</style>`;
const page=(inner,foot='占いは予言ではありません。自分を見つめ直すための道具です。')=>`<!doctype html><html><head><meta charset="utf-8">${CSS}</head><body><div class="stars"></div><div class="mark">生命の樹タロット AI版</div>${inner}<div class="foot">${foot}</div></body></html>`;
async function render(htmls,out){fs.mkdirSync(out,{recursive:true});const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
 for(let i=0;i<htmls.length;i++){const f=path.join(out,`_${i}.html`);fs.writeFileSync(f,htmls[i]);await p.goto('file://'+f);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);await p.screenshot({path:path.join(out,String(i+1).padStart(2,'0')+'.png')});fs.unlinkSync(f);}
 await b.close();}
// 型A：3枚から1枚えらんで  args: date(表示) c1 r1 c2 r2 c3 r3 (r=0正/1逆)
function pickA(label,picks,msg='今日のあなたへのメッセージ',ctaTop=null,doLabel='今日したいこと'){
 const s=[];
 s.push(page(`<div class="sp"></div><p class="small">${label}</p><h1 style="margin-top:30px">直感で<br>1枚えらんでください</h1><p style="margin-top:40px">${msg}</p>
 <div class="row">${[1,2,3].map(n=>`<div class="back">${TREE}<div class="num">${n}</div></div>`).join('')}</div><p class="small">選んだら、スワイプ →</p><div class="sp"></div>`));
 picks.forEach(([c,r],i)=>{const x=d.DY_CARDS[c][r];chk(x.title,x.words,x.do[0]);
  s.push(page(`<p class="small">${i+1} を選んだあなた</p><img class="card ${r?'rev':''}" style="margin:40px 0 30px" src="${BASE}cards/${String(c).padStart(2,'0')}.webp"><h2 class="gold">${NAMES[c]}${r?'（逆位置）':''}</h2><h1 style="font-size:66px;margin:20px 0 36px">${x.title}</h1>
  <div class="box"><p style="font-size:44px;text-align:left">${doLabel}<br><span class="gold">◯</span> ${x.do[0]}</p></div><p style="margin-top:36px;font-size:44px" class="gold">「${x.words}」</p>`));});
//CTA
 s.push(CTA(ctaTop));if(0)s.push(page(`<div class="sp"></div><h2>あなただけの<br>「今日の一枚」は<br>アプリで引けます</h2><p style="margin:60px 0">今日の予定に合わせて<br>したいこと・気をつけたいことを<br>カード1枚で診断します</p>
 <div class="back" style="transform:scale(1.15)">${TREE}</div><p style="margin-top:110px" class="gold">生命の樹タロット AI版</p><p class="small" style="margin-top:20px">登録なし・無料｜プロフィールのリンクから</p><div class="sp"></div>`,'AIタロット｜占いは予言ではありません。自分を見つめ直すための道具です。'));
 return s;}

const BAN=/運|吉/;
function chk(...t){t.forEach(x=>{if(BAN.test(x))throw new Error('禁止語: '+x)});}
const CTA=(top)=>page(`<div class="sp"></div><h2>${top||'あなただけの<br>「今日の一枚」は<br>アプリで引けます'}</h2><p style="margin:60px 0">今日の予定に合わせて<br>したいこと・気をつけたいことを<br>カード1枚で診断します</p>
 <div class="back" style="transform:scale(1.15)">${TREE}</div><p style="margin-top:110px" class="gold">生命の樹タロット AI版</p><p class="small" style="margin-top:20px">登録なし・無料｜プロフィールのリンクから</p><div class="sp"></div>`,'AIタロット｜占いは予言ではありません。自分を見つめ直すための道具です。');
const PLAN={work:'仕事・学校',meet:'人に会う',home:'家事・育児',off:'休日',tired:'体調がいまいち'};
// 型B：予定別  card,r,planKey,hook
function typeB(c,r,plan,hook){const x=d.DY_CARDS[c][r];const pt=d.DY_PLAN[c][r][plan];chk(x.title,x.words,...x.do,x.avoid[0],pt);
 const s=[];
 s.push(page(`<div class="sp"></div><p class="small">今日の予定別タロット</p><h1 style="margin-top:30px">${hook}</h1><p style="margin-top:50px">今日の予定が「${PLAN[plan]}」の人へ<br>カード1枚からのヒント</p><div class="back" style="margin-top:90px">${TREE}</div><p class="small" style="margin-top:60px">スワイプ →</p><div class="sp"></div>`));
 s.push(page(`<p class="small">今日のカード</p><img class="card ${r?'rev':''}" style="margin:40px 0 30px;width:400px" src="${BASE}cards/${String(c).padStart(2,'0')}.webp"><h2 class="gold">${NAMES[c]}${r?'（逆位置）':''}</h2><h1 style="font-size:72px;margin-top:24px">${x.title}</h1>`));
 s.push(page(`<div class="sp"></div><p class="small">「${PLAN[plan]}」の今日は</p><div class="box" style="margin-top:40px"><p style="text-align:left">${pt}</p></div><div class="sp"></div>`));
 s.push(page(`<div class="sp"></div><h2 class="gold">今日したいこと</h2><div class="box" style="margin-top:40px">${x.do.map(t=>`<p style="text-align:left;font-size:44px;margin:14px 0"><span class="gold">◯</span> ${t}</p>`).join('')}</div>
 <h2 class="gold" style="margin-top:70px">気をつけたいこと</h2><div class="box" style="margin-top:40px"><p style="text-align:left;font-size:44px"><span class="gold">△</span> ${x.avoid[0]}</p></div><div class="sp"></div>`));
 s.push(CTA());return s;}
// 型C1：カード解説
function about(c,hook){const t=d.DY_ABOUT[c];chk(t);const parts=t.split('。').filter(Boolean);
 const s=[];
 s.push(page(`<div class="sp"></div><p class="small">カード1枚の読み方</p><h1 style="margin-top:30px">${hook}</h1><img class="card" style="margin:80px 0 40px;width:380px" src="${BASE}cards/${String(c).padStart(2,'0')}.webp"><h2 class="gold">${NAMES[c]}</h2><div class="sp"></div>`));
 s.push(page(`<div class="sp"></div><h2 class="gold">絵に描かれているもの</h2><div class="box" style="margin-top:40px"><p style="text-align:left">${parts[0]}。</p></div><div class="sp"></div>`));
 s.push(page(`<div class="sp"></div><h2 class="gold">タロットでの意味</h2><div class="box" style="margin-top:40px"><p style="text-align:left">${parts[1]}。</p></div><div class="sp"></div>`));
 s.push(page(`<div class="sp"></div><h2 class="gold">このアプリでの読み方</h2><div class="box" style="margin-top:40px"><p style="text-align:left">${parts.slice(2).join('。')}。</p></div><div class="sp"></div>`));
 s.push(CTA());return s;}
// 型C2：使い方
function howto(){const st=(n,t,img,sub)=>page(`<p class="small">使い方 ${n}/3</p><h2 style="margin:20px 0 40px">${t}</h2><img src="${BASE}${img}" style="width:540px;border-radius:30px;border:3px solid #e8c46a88;box-shadow:0 20px 60px #000a"><p style="margin-top:36px;font-size:42px">${sub}</p>`);
 return [page(`<div class="sp"></div><h1>朝30秒で<br>今日の過ごし方が<br>決まるタロット</h1><p style="margin-top:60px">「今日の一枚」の使い方</p><div class="back" style="margin-top:90px">${TREE}</div><div class="sp"></div>`),
  st(1,'今日の予定を選ぶ','s_step1.png','選ばなくても大丈夫'),st(2,'気になる1枚をタップ','s_step2.png','今日の見出しが出ます'),st(3,'したいこと・<br>気をつけたいことを確認','s_step3.png','具体的な行動が3つずつ'),CTA()];}
module.exports={pickA,typeB,about,howto,render,NAMES,d,chk};
if(require.main===module){let [out,label,...a]=process.argv.slice(2);out=path.resolve(out);const picks=[];for(let i=0;i<a.length;i+=2)picks.push([+a[i],+a[i+1]]);render(pickA(label,picks),out).then(()=>console.log('done'));}
