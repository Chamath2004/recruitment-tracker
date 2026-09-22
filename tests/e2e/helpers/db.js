const { execFileSync } = require('child_process');
const path = require('path');

const PHP_BIN = 'C:/xampp/php/php.exe';
const SEED_SCRIPT = path.join(__dirname, '..', 'seed_helper.php');

const QA_DOMAIN = 'qa.altrium.test';

function qaEmail(label) {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${label}_${rand}@${QA_DOMAIN}`.toLowerCase();
}

// Minimal escaping for the synthetic, controlled values this suite generates
// (random hex + a fixed domain) — not a general-purpose SQL sanitizer.
function sqlStr(value) {
  return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function runSql(sql) {
  const out = execFileSync(PHP_BIN, [SEED_SCRIPT, sql], { encoding: 'utf8' });
  return JSON.parse(out);
}

function hashPassword(plain) {
  return execFileSync(
    PHP_BIN,
    ['-r', 'echo password_hash($argv[1], PASSWORD_DEFAULT);', '--', plain],
    { encoding: 'utf8' }
  ).trim();
}

module.exports = { qaEmail, sqlStr, runSql, hashPassword, QA_DOMAIN };
