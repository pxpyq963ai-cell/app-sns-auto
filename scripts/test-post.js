// テスト投稿：手動で1本だけ出して、鍵が正しいか確かめる
// 入力：TEST_TARGET（x / threads / instagram）、TEST_TEXT（本文）
const path = require('path'); const { findNG } = require('../lib/ng');
const X = require('../lib/x'); const IG = require('../lib/ig'); const TH = require('../lib/threads');
(async () => {
  const target = process.env.TEST_TARGET; const text = process.env.TEST_TEXT;
  const ng = findNG(text); if (ng.length) throw new Error('禁止語: ' + ng);
  if (target === 'x') {
    const ids = await X.post({ text });
    console.log('Xに投稿しました https://x.com/i/web/status/' + ids[0]);
  } else if (target === 'threads') {
    const ids = await TH.post({ text });
    console.log('Threadsに投稿しました id=' + ids[0]);
  } else if (target === 'instagram') {
    const url = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/main/test/test.jpg`;
    const ids = await IG.post({ caption: text, urls: [url] });
    console.log('Instagramに投稿しました id=' + ids[0]);
  } else throw new Error('TEST_TARGET は x / threads / instagram');
})().catch(e => { console.error('失敗:', e.message); process.exit(1); });
