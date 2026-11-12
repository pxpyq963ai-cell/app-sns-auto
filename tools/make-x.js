// 作文係の道具：計画ファイル（JSON）から、X・Threads・Instagram用の投稿を queue/ に作る
// 使い方: node tools/make-x.js plans/2026-11-12.json
// 計画の1件（kind で画像の種類が変わる。共通: id, at, kind, hook_type, score, text, reply）
//  A 直感で1枚: label, picks:[[カード,0正/1逆]×3]
//  B 予定別   : card, rev, plan（work/meet/home/off/tired）, hook（画像の見出し。<br>で改行）
//  C カード解説: card, hook
//  howto 使い方: 追加の項目なし
//  "video": true にすると、全スライドの約20秒動画（BGMつき）も作り、Xには動画で出す（失敗したら画像で出す）
//  "th": {text, reply}  → Threadsにも出す。全スライド（縦9:16）をカルーセルで。本文500字まで
//  "ig": {caption}      → Instagramにも出す。全スライドを縦4:5（1080x1350、上下ぼかし背景）に直してカルーセルで。2200字・タグ30個まで
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const g = require('./gen.js'); const { findNG } = require('../lib/ng');
const { execFileSync } = require('child_process');
// 動画：全スライドを1枚4.5秒、0.5秒で切り替え、BGMつきの約20秒の縦動画にする
async function makeVideo(p, slides, out) {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'v-'));
  const pngs = [];
  for (let i = 0; i < slides.length; i++) {
    const f = path.join(__dirname, `_v${i}.html`);
    fs.writeFileSync(f, slides[i].replace('選んだら、スワイプ →', '選んだら、そのまま見てください').replace('スワイプ →', 'このまま見てください'));
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    const png = path.join(tmp, `${i}.png`); await p.screenshot({ path: png }); fs.unlinkSync(f); pngs.push(png);
  }
  const D = 4.5, X = 0.5, n = pngs.length, total = n * D - (n - 1) * X;
  const args = ['-v', 'error', '-y'];
  pngs.forEach(f => args.push('-loop', '1', '-t', String(D), '-i', f));
  args.push('-i', path.join(__dirname, 'bgm_mystic.m4a'));
  let chain = '', last = '[0:v]';
  for (let i = 1; i < n; i++) { const o = i === n - 1 ? '[v]' : `[x${i}]`; chain += `${last}[${i}:v]xfade=transition=fade:duration=${X}:offset=${(i * (D - X)).toFixed(2)}${o};`; last = o; }
  args.push('-filter_complex', chain + `[${n}:a]afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5[a]`, '-map', '[v]', '-map', '[a]',
    '-t', total.toFixed(2), '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'medium', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out);
  execFileSync('ffmpeg', args);
  fs.rmSync(tmp, { recursive: true });
}
// スライド1枚を写真にする（swipe=true ならカルーセル用に「スワイプ →」のまま）
async function shot(p, html, out, opt = {}) {
  const f = path.join(__dirname, '_tmp.html'); fs.writeFileSync(f, html);
  await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: out, type: opt.png ? 'png' : 'jpeg', ...(opt.png ? {} : { quality: 88 }) }); fs.unlinkSync(f);
}
// 縦9:16 → 縦4:5（Instagramのフィードの上限）。全体を縮めて真ん中に置き、左右は同じ絵をぼかして埋める
function toIG(src, out) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-filter_complex',
    '[0]scale=1080:1920,crop=1080:1350,boxblur=40:2,eq=brightness=-0.15[bg];[0]scale=-2:1350[fg];[bg][fg]overlay=(W-w)/2:0',
    '-frames:v', '1', '-q:v', '3', out]);
}
(async () => {
  const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const e of plan) {
    const kind = e.kind || 'A';
    const cards = kind === 'A' ? e.picks.map(x => x[0]) : kind === 'howto' ? [] : [e.card];
    if (cards.includes(10)) throw new Error(`${e.id}: 運命の輪は使わない（「運」の字が入るため）`);
    const ng = findNG(e.text, e.reply); if (ng.length) throw new Error(`${e.id}: 禁止語 ${ng}`);
    const w = s => [...(s || '')].reduce((a, c) => a + (c.codePointAt(0) > 0x10ff ? 2 : 1), 0);
    for (const t of [e.text, e.reply]) if (w(t) > 280) throw new Error(`${e.id}: Xの文字数オーバー（全角140字まで）`);
    if (e.th) {
      const ng2 = findNG(e.th.text, e.th.reply); if (ng2.length) throw new Error(`${e.id}: Threadsに禁止語 ${ng2}`);
      for (const t of [e.th.text, e.th.reply]) if ([...(t || '')].length > 500) throw new Error(`${e.id}: Threadsは500字まで`);
    }
    if (e.ig) {
      const ng3 = findNG(e.ig.caption); if (ng3.length) throw new Error(`${e.id}: Instagramに禁止語 ${ng3}`);
      if ([...e.ig.caption].length > 2200 || (e.ig.caption.match(/#/g) || []).length > 30) throw new Error(`${e.id}: Instagramの文字数かタグ数オーバー`);
    }
    const dir = path.join(__dirname, '..', 'queue', e.id); fs.mkdirSync(dir, { recursive: true });
    const slides = kind === 'A' ? g.pickA(e.label, e.picks) : kind === 'B' ? g.typeB(e.card, e.rev || 0, e.plan, e.hook)
      : kind === 'C' ? g.about(e.card, e.hook) : g.howto();
    const slide = slides[0];
    const html = slide.replace('選んだら、スワイプ →', '答えは返信で →').replace('スワイプ →', '答えは返信で →');
    await shot(p, html, path.join(dir, '01.jpg'));
    const x = { text: e.text, reply: e.reply, image: '01.jpg' };
    if (e.video) { await makeVideo(p, slides, path.join(dir, 'short.mp4')); x.video = 'short.mp4'; }
    const out = { at: e.at, x };
    if (e.th || e.ig) {
      const th = [], ig = [];
      for (let i = 0; i < slides.length; i++) {
        const png = path.join(__dirname, `_s${i}.png`); await shot(p, slides[i], png, { png: true });
        if (e.th) { const f = `th${i + 1}.jpg`; execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-q:v', '3', path.join(dir, f)]); th.push(f); }
        if (e.ig) { const f = `ig${i + 1}.jpg`; toIG(png, path.join(dir, f)); ig.push(f); }
        fs.unlinkSync(png);
      }
      if (e.th) out.threads = { text: e.th.text, reply: e.th.reply, images: th };
      if (e.ig) out.instagram = { caption: e.ig.caption, images: ig };
    }
    fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify(out, null, 2) + '\n');
    console.log('○', e.id);
  }
  await b.close();
})().catch(e => { console.error('×', e.message); process.exit(1); });
