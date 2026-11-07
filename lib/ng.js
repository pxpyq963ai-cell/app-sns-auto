// 禁止語チェック：1つでも当たったら投稿しない
const NG = [/運/, /吉/, /当たる/, /当たり/, /的中/, /霊視/, /呪い/, /必ず叶/, /絶対に叶/];
function findNG(...texts) {
  const hits = [];
  for (const t of texts) for (const r of NG) if (t && r.test(t)) hits.push(r.source);
  return [...new Set(hits)];
}
module.exports = { findNG };
