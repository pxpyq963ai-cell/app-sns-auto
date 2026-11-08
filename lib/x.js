// X（旧Twitter）API v2：OAuth 1.0a ユーザー認証で投稿・数字の取得
const crypto = require('crypto');
const fs = require('fs');
const API = 'https://api.x.com/2';
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function keys() {
  const k = { ck: process.env.X_API_KEY, cs: process.env.X_API_SECRET, at: process.env.X_ACCESS_TOKEN, as: process.env.X_ACCESS_SECRET };
  return Object.values(k).every(Boolean) ? k : null;
}
function auth(method, url, query = {}) {
  const k = keys();
  const o = { oauth_consumer_key: k.ck, oauth_nonce: crypto.randomBytes(16).toString('hex'), oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(), oauth_token: k.at, oauth_version: '1.0' };
  const all = { ...query, ...o };
  const base = Object.keys(all).sort().map(x => `${enc(x)}=${enc(all[x])}`).join('&');
  const sig = crypto.createHmac('sha1', `${enc(k.cs)}&${enc(k.as)}`).update(`${method}&${enc(url)}&${enc(base)}`).digest('base64');
  o.oauth_signature = sig;
  return 'OAuth ' + Object.keys(o).sort().map(x => `${enc(x)}="${enc(o[x])}"`).join(', ');
}
async function call(method, path, { json, form, query } = {}) {
  const url = API + path;
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const headers = { Authorization: auth(method, url, query || {}) };
  let body;
  if (json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  const r = await fetch(url + qs, { method, headers, body });
  const t = await r.text();
  if (!r.ok) throw new Error(`X ${method} ${path} ${r.status}: ${t.slice(0, 500)}`);
  return t ? JSON.parse(t) : {};
}
async function uploadImage(file) {
  const f = new FormData();
  f.append('media', new Blob([fs.readFileSync(file)], { type: 'image/jpeg' }), 'image.jpg');
  f.append('media_category', 'tweet_image');
  const r = await call('POST', '/media/upload', { form: f });
  return (r.data && r.data.id) || r.media_id_string;
}
// 動画は分割アップロード（初期化 → 分割送信 → 完了 → 処理待ち）
async function uploadVideo(file) {
  const buf = fs.readFileSync(file);
  const init = await call('POST', '/media/upload/initialize', { json: { media_type: 'video/mp4', total_bytes: buf.length, media_category: 'tweet_video' } });
  const id = init.data.id;
  const CH = 4 * 1024 * 1024;
  for (let i = 0, seg = 0; i < buf.length; i += CH, seg++) {
    const f = new FormData();
    f.append('media', new Blob([buf.subarray(i, i + CH)], { type: 'application/octet-stream' }), 'chunk');
    f.append('segment_index', String(seg));
    await call('POST', `/media/upload/${id}/append`, { form: f });
  }
  let info = (await call('POST', `/media/upload/${id}/finalize`)).data.processing_info;
  for (let n = 0; info && info.state !== 'succeeded' && n < 40; n++) {
    if (info.state === 'failed') throw new Error('X動画の処理に失敗: ' + JSON.stringify(info.error || info));
    await new Promise(r => setTimeout(r, Math.max(2, info.check_after_secs || 3) * 1000));
    info = (await call('GET', '/media/upload', { query: { command: 'STATUS', media_id: id } })).data.processing_info;
  }
  if (info && info.state !== 'succeeded') throw new Error('X動画の処理が終わらない');
  return id;
}
async function post({ text, image, video, reply }) {
  const body = { text };
  let used = 'text';
  if (video) {
    try { body.media = { media_ids: [await uploadVideo(video)] }; used = 'video'; }
    catch (e) { console.log('△ 動画のアップロードに失敗したので画像で出します: ' + e.message); }
  }
  if (!body.media && image) { body.media = { media_ids: [await uploadImage(image)] }; used = 'image'; }
  console.log('  メディア: ' + used);
  const main = await call('POST', '/tweets', { json: body });
  const ids = [main.data.id];
  if (reply) {
    const r = await call('POST', '/tweets', { json: { text: reply, reply: { in_reply_to_tweet_id: main.data.id } } });
    ids.push(r.data.id);
  }
  return ids;
}
async function metrics(ids) {
  if (!ids.length) return [];
  const r = await call('GET', '/tweets', { query: { ids: ids.join(','), 'tweet.fields': 'public_metrics,created_at' } });
  return (r.data || []).map(t => ({ id: t.id, created_at: t.created_at, ...t.public_metrics }));
}
module.exports = { ready: () => !!keys(), post, metrics };
