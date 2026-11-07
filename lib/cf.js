// Cloudflare Web Analytics：アプリの閲覧数（日別・どこから来たか）
async function q(query, variables) {
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors && j.errors.length) throw new Error('CF ' + JSON.stringify(j.errors).slice(0, 500));
  return j.data.viewer.accounts[0];
}
async function metrics(days = 8) {
  const to = new Date(); const from = new Date(Date.now() - days * 864e5);
  const d = x => x.toISOString().slice(0, 10);
  const v = { a: process.env.CF_ACCOUNT_ID, s: process.env.CF_SITE_TAG, f: d(from), t: d(to) };
  const filt = `filter: { date_geq: $f, date_leq: $t, siteTag: $s }`;
  const query = `query($a: string!, $s: string!, $f: Date!, $t: Date!) { viewer { accounts(filter: { accountTag: $a }) {
    daily: rumPageloadEventsAdaptiveGroups(limit: 100, ${filt}, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
    ref: rumPageloadEventsAdaptiveGroups(limit: 50, ${filt}, orderBy: [sum_visits_DESC]) { count sum { visits } dimensions { refererHost } }
    page: rumPageloadEventsAdaptiveGroups(limit: 30, ${filt}, orderBy: [count_DESC]) { count dimensions { requestPath } } } } }`;
  const a = await q(query, v);
  return {
    daily: a.daily.map(x => ({ date: x.dimensions.date, pageviews: x.count, visits: x.sum.visits })),
    referrers: a.ref.map(x => ({ host: x.dimensions.refererHost || '(直接)', pageviews: x.count, visits: x.sum.visits })),
    pages: a.page.map(x => ({ path: x.dimensions.requestPath, pageviews: x.count })) };
}
module.exports = { ready: () => !!(process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID && process.env.CF_SITE_TAG), metrics };
