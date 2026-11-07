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
  return JSON.parse(t);
}
async function uploadImage(file) {
  const f = new FormData();
  f.append('media', new Blob([fs.readFileSync(file)], { type: 'image/jpeg' }), 'image.jpg');
  f.append('media_category', 'tweet_image');
  const r = await call('POST', '/media/upload', { form: f });
  return (r.data && r.data.id) || r.media_id_string;
}
async function post({ text, image, reply }) {
  const body = { text };
  if (image) body.media = { media_ids: [await uploadImage(image)] };
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
