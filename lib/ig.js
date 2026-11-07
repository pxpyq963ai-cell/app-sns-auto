// Instagram API（Instagramログイン方式）：カルーセル投稿・数字の取得・鍵の更新
const API = 'https://graph.instagram.com/v23.0';
const token = () => process.env.IG_ACCESS_TOKEN;
async function call(method, path, params = {}) {
  const p = new URLSearchParams({ ...params, access_token: token() });
  const url = method === 'GET' ? `${API}${path}?${p}` : `${API}${path}`;
  const r = await fetch(url, method === 'GET' ? {} : { method, body: p });
  const t = await r.text();
  if (!r.ok) throw new Error(`IG ${method} ${path} ${r.status}: ${t.slice(0, 500)}`);
  return JSON.parse(t);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitReady(id) {
  for (let i = 0; i < 30; i++) {
    const s = await call('GET', `/${id}`, { fields: 'status_code' });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('IG container ' + s.status_code);
    await sleep(5000);
  }
  throw new Error('IG container timeout');
}
// urls：誰でも開ける画像URL（JPEG）。2枚以上ならカルーセル
async function post({ caption, urls }) {
  let creation;
  if (urls.length === 1) {
    creation = (await call('POST', '/me/media', { image_url: urls[0], caption })).id;
  } else {
    const kids = [];
    for (const u of urls) kids.push((await call('POST', '/me/media', { image_url: u, is_carousel_item: 'true' })).id);
    for (const k of kids) await waitReady(k);
    creation = (await call('POST', '/me/media', { media_type: 'CAROUSEL', children: kids.join(','), caption })).id;
  }
  await waitReady(creation);
  const r = await call('POST', '/me/media_publish', { creation_id: creation });
  return [r.id];
}
async function metrics(ids) {
  const out = [];
  for (const id of ids) {
    try {
      const r = await call('GET', `/${id}/insights`, { metric: 'views,reach,likes,comments,saved,shares' });
      const m = { id };
      for (const x of r.data) m[x.name] = x.values ? x.values[0].value : x.total_value?.value;
      out.push(m);
    } catch (e) { out.push({ id, error: e.message }); }
  }
  const acct = await call('GET', '/me', { fields: 'username,followers_count,media_count' }).catch(e => ({ error: e.message }));
  return { posts: out, account: acct };
}
async function refresh() {
  const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token()}`);
  const j = await r.json();
  if (!j.access_token) throw new Error('IG refresh failed: ' + JSON.stringify(j));
  return j.access_token;
}
module.exports = { ready: () => !!token(), post, metrics, refresh };
