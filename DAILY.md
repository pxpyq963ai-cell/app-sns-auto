# 毎日の見直し係（Claudeの毎日のルーチン）

毎日 日本時間 1時台に動く（0時の数字集めのあと）。TKの方針：分析して見られやすくする作業は常に自動で行う。運営はClaudeに任されている。

## 1. 点検
- `data/posted.json` に失敗（error）や禁止語ブロック（blocked）がないか（x・threads・instagram それぞれ）。Threads・Instagramの鍵切れ（401や「Session has expired」）なら、reports/daily/ に書き、TKに知らせる必要があることを明記する。あれば原因を調べ、`queue/` 側で直せるもの（文字数、禁止語、画像の欠け）は直す。プログラムの不具合なら `reports/daily/` に書く（lib/ scripts/ .github/ は変えない）
- キューが3日分未満なら、ROUTINE.md の作り方で7日分まで足す（止まらないための保険）

## 2. 昨日の数字を見る
- 最新の `data/metrics/*.json` から、直近の投稿の表示回数・返信・いいね（X・Threads・Instagram それぞれ）、アプリ訪問数、X（t.co）からの訪問を見る
- `data/posted.json` に「メディア」の記録はないので、post.json の video の有無で画像か動画かを判断する
- 過去の投稿（同じ曜日・同じ hook_type・画像か動画か）と比べて、よかった点・悪かった点を1〜2行で

## 3. まだ出ていない投稿を良くする
- 6時間以上先の投稿だけ見直してよい（直前の書き換えはしない）
- よかった書き出しの型に寄せる、反応がなかった言い回しを避ける、曜日や季節の話題を足す。ROUTINE.md の「見られるための作り方」と「守ること」を必ず守る
- 書き換えたら `node tools/make-x.js` で作り直し、計画（plans/）も同じ内容に直す
- 変える理由がなければ、変えなくてよい

## 4. 記録して保存
- `reports/daily/YYYY-MM-DD.md` に3〜6行（昨日の数字・気づき・変えたこと）
- `git add queue plans reports && git commit -m "毎日の見直し YYYY-MM-DD" && git pull --rebase && git push origin main`
