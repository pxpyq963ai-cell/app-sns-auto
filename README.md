# app-sns-auto（生命の樹タロット AI版 のSNS自動投稿）

## 3つの係
- **作文係**（Claudeのルーチン・毎週）：数字を分析 → 翌週分の投稿を `queue/` に入れる
- **投稿係**（`.github/workflows/post.yml`・毎日 7:00 / 12:00 / 21:00）：`queue/` の投稿を X・Instagram に出す
- **集計係**（`.github/workflows/collect.yml`・毎日 0:00）：数字を `data/metrics/日付.json` に保存

## 投稿1本の形（queue/2026-11-12_0700_型A/post.json）
```json
{
  "at": "2026-11-12T07:00:00+09:00",
  "x": { "text": "本文", "reply": "続き（なくてもよい）", "image": "01.jpg" },
  "instagram": { "caption": "本文", "images": ["01.jpg", "02.jpg", "03.jpg", "04.jpg", "05.jpg"] }
}
```
画像はJPEG（InstagramはJPEGのみ受け付けるため）。

## 安全のしくみ
- 禁止語（運・吉・当たる など、`lib/ng.js`）があれば投稿しない
- 予定から3時間以上遅れた投稿は出さない
- 失敗したら GitHub からメールが届く。結果は `data/posted.json`
- 鍵はすべて GitHub の Secrets（金庫）に入れる。このリポジトリには書かない

## 金庫（Settings → Secrets and variables → Actions）に入れる鍵
| 名前 | 中身 |
|---|---|
| X_API_KEY / X_API_SECRET | XアプリのConsumer Key / Secret |
| X_ACCESS_TOKEN / X_ACCESS_SECRET | @tkver005 のAccess Token / Secret（読み書き権限） |
| IG_ACCESS_TOKEN | Instagram（@tkkoumei）の長期アクセストークン |
| GH_PAT | Instagramの鍵を自動更新するためのGitHubトークン（このリポジトリのSecrets書き込み権限のみ） |
| CF_API_TOKEN / CF_ACCOUNT_ID / CF_SITE_TAG | Cloudflare Web Analytics の読み取り用 |
