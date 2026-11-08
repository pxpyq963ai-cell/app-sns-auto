// 作文係の道具：計画ファイル（JSON）から、X用の投稿を queue/ に作る
// 使い方: node tools/make-x.js plans/2026-11-12.json
// 計画の1件（kind で画像の種類が変わる。共通: id, at, kind, hook_type, score, text, reply）
//  A 直感で1枚: label, picks:[[カード,0正/1逆]×3]
//  B 予定別   : card, rev, plan（work/meet/home/off/tired）, hook（画像の見出し。<br>で改行）
//  C カード解説: card, hook
//  howto 使い方: 追加の項目なし
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const g = require('./gen.js'); const { findNG } = require('../lib/ng');
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
    const dir = path.join(__dirname, '..', 'queue', e.id); fs.mkdirSync(dir, { recursive: true });
    const slide = kind === 'A' ? g.pickA(e.label, e.picks)[0] : kind === 'B' ? g.typeB(e.card, e.rev || 0, e.plan, e.hook)[0]
      : kind === 'C' ? g.about(e.card, e.hook)[0] : g.howto()[0];
    const html = slide.replace('選んだら、スワイプ →', '答えは返信で →').replace('スワイプ →', '答えは返信で →');
    const f = path.join(__dirname, '_tmp.html'); fs.writeFileSync(f, html);
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(dir, '01.jpg'), type: 'jpeg', quality: 88 }); fs.unlinkSync(f);
    fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify({ at: e.at, x: { text: e.text, reply: e.reply, image: '01.jpg' } }, null, 2) + '\n');
    console.log('○', e.id);
  }
  await b.close();
})().catch(e => { console.error('×', e.message); process.exit(1); });
