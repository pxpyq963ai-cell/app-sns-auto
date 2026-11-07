// Instagramの鍵（60日で切れる）を新しくして表示する。ワークフローがGitHubの金庫へ保存し直す
require('../lib/ig').refresh().then(t => process.stdout.write(t)).catch(e => { console.error(e.message); process.exit(1); });
