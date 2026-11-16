// TikTok係の道具：TKが週1回まとめて手で予約するための「動画＋投稿文＋手順」を1つのフォルダにそろえる
// 使い方: node tools/tiktok-pack.js 2026-11-17 2026-11-23 出力フォルダ
// 計画（plans/*.json）で "tt": {"caption"} が付いた投稿を、日付・時刻順に集める
//  - 動画は queue/<id>/short.mp4 をコピーして「11-17_0700_朝の1枚.mp4」のような名前にする（動画がなければ止まる）
//  - 予約リスト.md に、予約する日時・動画の名前・貼る文・予約の手順を書く
const fs = require('fs'); const path = require('path');
const { findNG } = require('../lib/ng');
const [from, to, out] = process.argv.slice(2);
if (!from || !to || !out) { console.error('使い方: node tools/tiktok-pack.js 開始日 終了日 出力フォルダ'); process.exit(1); }
const root = path.join(__dirname, '..');
const KIND = { A: '朝の1枚', B: '予定別', C: 'カード解説', howto: '使い方' };
const W = '日月火水木金土';
const items = [];
for (const f of fs.readdirSync(path.join(root, 'plans')).filter(f => f.endsWith('.json'))) {
  for (const e of JSON.parse(fs.readFileSync(path.join(root, 'plans', f), 'utf8'))) {
    const day = e.at.slice(0, 10);
    if (!e.tt || day < from || day > to) continue;
    const ng = findNG(e.tt.caption); if (ng.length) throw new Error(`${e.id}: TikTokの文に禁止語 ${ng}`);
    if ([...e.tt.caption].length > 2200) throw new Error(`${e.id}: TikTokの文は2200字まで`);
    const src = path.join(root, 'queue', e.id, 'short.mp4');
    if (!fs.existsSync(src)) throw new Error(`${e.id}: 動画（short.mp4）がない。計画に "video": true を付けて make-x.js で作る`);
    items.push({ e, day, time: e.at.slice(11, 16), src });
  }
}
items.sort((a, b) => a.e.at < b.e.at ? -1 : 1);
if (!items.length) throw new Error('この期間に "tt" の付いた投稿がない');
fs.mkdirSync(out, { recursive: true });
const md = [];
md.push(`# TikTok 予約リスト（${from.slice(5).replace('-', '/')}〜${to.slice(5).replace('-', '/')}・${items.length}本）`, '');
md.push('動画はこのフォルダの中にあります。下の表の順に、1本ずつ予約してください。', '');
md.push('| 予約する日時 | 動画の名前 | 内容 |', '|---|---|---|');
for (const it of items) {
  const wd = W[new Date(it.day + 'T12:00:00Z').getUTCDay()];
  it.label = `${+it.day.slice(5, 7)}/${+it.day.slice(8, 10)}（${wd}） ${it.time}`;
  it.file = `${it.day.slice(5)}_${it.time.replace(':', '')}_${KIND[it.e.kind || 'A'] || it.e.kind}.mp4`;
  fs.copyFileSync(it.src, path.join(out, it.file));
  const what = (it.e.kind || 'A') === 'A' ? '直感で1枚（答えは動画の続き）' : (it.e.hook || '').replace(/<br>/g, '');
  md.push(`| ${it.label} | ${it.file} | ${what} |`);
}
md.push('', '## 予約のしかた（パソコン・1本1〜2分）',
  '1. ブラウザで TikTok Studio を開く（https://www.tiktok.com/tiktokstudio/upload ）',
  '2. 「動画を選択」→ このフォルダの動画を1本選ぶ',
  '3. 「説明」に、下の同じ日時の文をそのまま貼る',
  '4. 「AI生成コンテンツ」はオフのまま（カードの絵は1909年の実物のスキャンで、写真のようなAI画像ではないため。AIタロットであることは文に書いてあります）',
  '5. 「いつ投稿するか」で「スケジュール」を選び、表の日時にする',
  '6. 「スケジュール」を押す → 次の動画へ',
  '',
  '- 予約できるのは10日先まで。いちばん近い日の分は、投稿時刻の少なくとも15分前までに予約してください',
  '- 動画の中に日付が入っているものがあるので、日付はずらさないでください',
  '- 動画にはBGMが入っています。TikTokの音楽は足さなくて大丈夫です',
  '- 「表示が制限された」などの通知が来たら、Claudeに教えてください', '',
  '## 貼る文', '');
for (const it of items) md.push(`### ${it.label}（${it.file}）`, '```', it.e.tt.caption, '```', '');
fs.writeFileSync(path.join(out, '予約リスト.md'), md.join('\n'));
console.log(`○ ${items.length}本 → ${out}`);
