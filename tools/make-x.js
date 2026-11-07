// 作文係の道具：計画ファイル（JSON）から、X用の投稿を queue/ に作る
// 使い方: node tools/make-x.js plans/2026-11-12.json
// 計画の1件: { "id":"2026-11-12_0700_xA", "at":"2026-11-12T07:00:00+09:00", "label":"11月12日（木）",
//             "picks":[[17,0],[7,0],[3,1]], "text":"本文", "reply":"続き（答え）" }
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const g = require('./gen.js'); const { findNG } = require('../lib/ng');
(async () => {
  const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const e of plan) {
    if (e.picks.some(([c]) => c === 10)) throw new Error(`${e.id}: 運命の輪は使わない（「運」の字が入るため）`);
    const ng = findNG(e.text, e.reply); if (ng.length) throw new Error(`${e.id}: 禁止語 ${ng}`);
    const w = s => [...(s || '')].reduce((a, c) => a + (c.codePointAt(0) > 0x10ff ? 2 : 1), 0);
    for (const t of [e.text, e.reply]) if (w(t) > 280) throw new Error(`${e.id}: Xの文字数オーバー（全角140字まで）`);
    const dir = path.join(__dirname, '..', 'queue', e.id); fs.mkdirSync(dir, { recursive: true });
    const html = g.pickA(e.label, e.picks)[0].replace('選んだら、スワイプ →', '答えは返信で →');
    const f = path.join(__dirname, '_tmp.html'); fs.writeFileSync(f, html);
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(dir, '01.jpg'), type: 'jpeg', quality: 88 }); fs.unlinkSync(f);
    fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify({ at: e.at, x: { text: e.text, reply: e.reply, image: '01.jpg' } }, null, 2) + '\n');
    console.log('○', e.id);
  }
  await b.close();
})().catch(e => { console.error('×', e.message); process.exit(1); });
