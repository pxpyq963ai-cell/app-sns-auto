// 集計係：X・Threads・Instagram・アプリの数字を集めて data/metrics/日付.json に保存
const fs = require('fs'); const path = require('path');
const X = require('../lib/x'); const IG = require('../lib/ig'); const CF = require('../lib/cf'); const TH = require('../lib/threads');
const ROOT = path.join(__dirname, '..'); const LOG = path.join(ROOT, 'data', 'posted.json');
const DAYS = 7;  // 直近7日分の投稿だけ数字を取る（Xは読むたびに料金がかかるため）
(async () => {
  const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : {};
  const since = Date.now() - DAYS * 864e5;
  const recent = k => Object.entries(log).filter(([, r]) => r[k] && r[k].ids && new Date(r[k].at).getTime() > since)
    .map(([id, r]) => ({ id, ids: r[k].ids }));
  const out = { collected_at: new Date().toISOString() };
  if (X.ready()) {
    try {
      const xs = recent('x'); const m = await X.metrics(xs.map(x => x.ids[0]));
      out.x = m.map(t => ({ post: (xs.find(x => x.ids[0] === t.id) || {}).id, ...t }));
    } catch (e) { out.x = { error: e.message }; }
  }
  if (TH.ready()) {
    try {
      const ts = recent('threads'); const m = await TH.metrics(ts.map(x => x.ids[0]));
      out.threads = { account: m.account, posts: m.posts.map(t => ({ post: (ts.find(x => x.ids[0] === t.id) || {}).id, ...t })) };
    } catch (e) { out.threads = { error: e.message }; }
  }
  if (IG.ready()) {
    try {
      const is = recent('instagram'); const m = await IG.metrics(is.map(x => x.ids[0]));
      out.instagram = { account: m.account, posts: m.posts.map(t => ({ post: (is.find(x => x.ids[0] === t.id) || {}).id, ...t })) };
    } catch (e) { out.instagram = { error: e.message }; }
  }
  if (CF.ready()) { try { out.app = await CF.metrics(DAYS + 1); } catch (e) { out.app = { error: e.message }; } }
  const dir = path.join(ROOT, 'data', 'metrics'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) + '.json');
  fs.writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
  console.log('保存しました', f);
})();
