// 投稿係：queue/ の中から「今の時刻」の投稿を探して X・Threads・Instagram に出す
// 鍵がまだ登録されていないSNSは、失敗にせず飛ばす（登録されたら次から出る）
// 使い方: node scripts/post.js        （本番）
//        DRY_RUN=1 node scripts/post.js （出さずに確認だけ）
const fs = require('fs'); const path = require('path');
const { findNG } = require('../lib/ng'); const X = require('../lib/x'); const IG = require('../lib/ig'); const TH = require('../lib/threads');
const ROOT = path.join(__dirname, '..'); const Q = path.join(ROOT, 'queue'); const LOG = path.join(ROOT, 'data', 'posted.json');
const DRY = !!process.env.DRY_RUN;
const EARLY_MS = 20 * 60e3;   // 予定の20分前から起きて待つ
const LATE_MS = 2 * 3600e3;   // 2時間以上遅れたものは出さない（「おはよう」が昼に出るなど、時間に合わない投稿を防ぐ）
const REPO = process.env.GITHUB_REPOSITORY || 'OWNER/sns-auto';
const BRANCH = process.env.GITHUB_REF_NAME || 'main';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : {};
  const items = fs.readdirSync(Q).filter(d => fs.existsSync(path.join(Q, d, 'post.json'))).sort();
  let failed = false;
  for (const id of items) {
    const dir = path.join(Q, id); const p = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
    const at = new Date(p.at).getTime(); const now = Date.now();
    if (at - now > EARLY_MS || now - at > LATE_MS) continue;
    const rec = log[id] || (log[id] = {});
    const KEYS = { x: X.ready(), threads: TH.ready(), instagram: IG.ready() };
    const todo = ['x', 'threads', 'instagram'].filter(k => p[k] && !(rec[k] && rec[k].ids));
    for (const k of todo.filter(k => !KEYS[k])) console.log(`- ${id} ${k} は鍵が未登録のため飛ばします`);
    if (!todo.some(k => KEYS[k])) continue;
    const ng = findNG(p.x && p.x.text, p.x && p.x.reply, p.threads && p.threads.text, p.threads && p.threads.reply, p.instagram && p.instagram.caption);
    if (ng.length) { rec.blocked = `禁止語: ${ng.join(',')}`; console.log(`× ${id} 禁止語のため中止: ${ng}`); failed = true; continue; }
    if (at > now) { console.log(`… ${id} 予定時刻まで ${Math.round((at - now) / 1000)} 秒待ちます`); if (!DRY) await sleep(at - now); }
    const url = f => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/queue/${encodeURIComponent(id)}/${f}`;
    for (const k of todo.filter(k => KEYS[k])) {
      try {
        let ids;
        if (k === 'x') {
          const image = p.x.image ? path.join(dir, p.x.image) : null;
          const video = p.x.video ? path.join(dir, p.x.video) : null;
          ids = DRY ? ['dry'] : await X.post({ text: p.x.text, image, video, reply: p.x.reply });
        } else if (k === 'threads') {
          const urls = (p.threads.images || []).map(url);
          ids = DRY ? ['dry'] : await TH.post({ text: p.threads.text, urls, reply: p.threads.reply });
        } else {
          const urls = p.instagram.images.map(url);
          ids = DRY ? ['dry'] : await IG.post({ caption: p.instagram.caption, urls });
        }
        rec[k] = { ids, at: new Date().toISOString() };
        console.log(`○ ${id} ${k} 投稿しました ${ids.join(',')}`);
      } catch (e) {
        rec[k] = { error: e.message, at: new Date().toISOString() };
        console.log(`× ${id} ${k} 失敗: ${e.message}`); failed = true;
      }
    }
  }
  if (!DRY) fs.writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');
  if (failed) process.exitCode = 1;   // 失敗したら GitHub がメールで知らせる
})();
