// Threads・Instagramの鍵（60日で切れる）を新しくして表示する。ワークフローがGitHubの金庫へ保存し直す
// 使い方: node scripts/refresh-token.js threads | instagram
const lib = { threads: '../lib/threads', instagram: '../lib/ig' }[process.argv[2]];
if (!lib) { console.error('threads か instagram を指定'); process.exit(1); }
require(lib).refresh().then(t => process.stdout.write(t)).catch(e => { console.error(e.message); process.exit(1); });
