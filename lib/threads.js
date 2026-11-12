// Threads API：投稿（文字・画像・カルーセル）、自分の投稿への続きの返信、数字の取得、鍵の更新
const API = 'https://graph.threads.net/v1.0';
const token = () => process.env.THREADS_ACCESS_TOKEN;
async function call(method, path, params = {}) {
  const p = new URLSearchParams({ ...params, access_token: token() });
  const url = method === 'GET' ? `${API}${path}?${p}` : `${API}${path}`;
  const r = await fetch(url, method === 'GET' ? {} : { method, body: p });
  const t = await r.text();
  if (!r.ok) throw new Error(`Threads ${method} ${path} ${r.status}: ${t.slice(0, 500)}`);
  return t ? JSON.parse(t) : {};
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 入れ物（コンテナ）の準備ができるまで待つ（公式の目安は約30秒）
async function waitReady(id) {
  for (let i = 0; i < 36; i++) {
    const s = await call('GET', `/${id}`, { fields: 'status,error_message' });
    if (s.status === 'FINISHED' || s.status === 'PUBLISHED') return;
    if (s.status === 'ERROR' || s.status === 'EXPIRED') throw new Error(`Threads container ${s.status} ${s.error_message || ''}`);
    await sleep(5000);
  }
  throw new Error('Threads container timeout');
}
async function publishOne({ text, urls = [], replyTo }) {
  const base = replyTo ? { reply_to_id: replyTo } : {};
  let creation;
  if (!urls.length) creation = (await call('POST', '/me/threads', { ...base, media_type: 'TEXT', text })).id;
  else if (urls.length === 1) creation = (await call('POST', '/me/threads', { ...base, media_type: 'IMAGE', image_url: urls[0], text })).id;
  else {
    const kids = [];
    for (const u of urls.slice(0, 20)) kids.push((await call('POST', '/me/threads', { media_type: 'IMAGE', image_url: u, is_carousel_item: 'true' })).id);
    for (const k of kids) await waitReady(k);
    creation = (await call('POST', '/me/threads', { ...base, media_type: 'CAROUSEL', children: kids.join(','), text })).id;
  }
  await waitReady(creation);
  return (await call('POST', '/me/threads_publish', { creation_id: creation })).id;
}
// urls：誰でも開ける画像URL。0枚なら文字だけ、2枚以上ならカルーセル。reply があれば自分の投稿に続けて返信する
async function post({ text, urls = [], reply }) {
  const ids = [await publishOne({ text, urls })];
  if (reply) {
    try { ids.push(await publishOne({ text: reply, replyTo: ids[0] })); }
    catch (e) { console.log('  Threads 続きの返信に失敗（本体は投稿済み）:', e.message); }
  }
  return ids;
}
async function metrics(ids) {
  const out = [];
  for (const id of ids) {
    try {
      const r = await call('GET', `/${id}/insights`, { metric: 'views,likes,replies,reposts,quotes,shares' });
      const m = { id };
      for (const x of r.data) m[x.name] = x.values ? x.values[0].value : x.total_value?.value;
      out.push(m);
    } catch (e) { out.push({ id, error: e.message }); }
  }
  const acct = await call('GET', '/me/threads_insights', { metric: 'followers_count' })
    .then(r => ({ followers_count: r.data?.[0]?.total_value?.value }))
    .catch(e => ({ error: e.message }));
  return { posts: out, account: acct };
}
async function refresh() {
  const r = await fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${token()}`);
  const j = await r.json();
  if (!j.access_token) throw new Error('Threads refresh failed: ' + JSON.stringify(j));
  return j.access_token;
}
module.exports = { ready: () => !!token(), post, metrics, refresh };
