// Builds a small public page of failed tests (name, error, screenshot) from Playwright's JSON results.
// Used by CI to publish to GitHub Pages instead of the Playwright HTML report, which is not safe to
// make public: its steps list typed values (e.g. Fill "<password>") and traces record login requests.
// Passwords and OTPs from testdata are masked in every error message.
//
// Usage: node scripts/failure-report.mjs <results.json> <output folder>
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [resultsPath = 'results.json', outDir = 'public-report'] = process.argv.slice(2);
const results = JSON.parse(readFileSync(resultsPath, 'utf8'));

/** Values that must never appear on the page. */
function collectSecrets() {
  const secrets = new Set();
  const authCsv = join('testdata', 'common', 'auth.csv');
  if (existsSync(authCsv)) {
    for (const line of readFileSync(authCsv, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^"?([^",]+)"?\s*,\s*"?(.*?)"?\s*$/);
      if (match && /password|otp/i.test(match[1])) secrets.add(match[2]);
    }
  }
  const addPasswords = (value) => {
    if (Array.isArray(value)) value.forEach(addPasswords);
    else if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) {
        if (/password/i.test(key) && typeof inner === 'string') secrets.add(inner);
        else addPasswords(inner);
      }
    }
  };
  for (const folder of ['common', 'localite', 'traveler'].map((name) => join('testdata', name))) {
    if (!existsSync(folder)) continue;
    for (const file of readdirSync(folder).filter((name) => /^created-.*\.json$/.test(name))) {
      try { addPasswords(JSON.parse(readFileSync(join(folder, file), 'utf8'))); } catch { /* not JSON */ }
    }
  }
  if (process.env.IMERZN_PASSWORD) secrets.add(process.env.IMERZN_PASSWORD);
  // Longest first, so a password containing another one is masked whole.
  return [...secrets].filter((secret) => secret.length >= 4).sort((a, b) => b.length - a.length);
}

const secrets = collectSecrets();
const mask = (text) => secrets.reduce((masked, secret) => masked.split(secret).join('***'), text);
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');
const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Every spec in the (nested) suites, with the file it belongs to. */
function* allSpecs(suites) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) yield spec;
    yield* allSpecs(suite.suites);
  }
}

mkdirSync(join(outDir, 'img'), { recursive: true });
const failures = [];
for (const spec of allSpecs(results.suites)) {
  if (spec.ok) continue;
  for (const test of spec.tests ?? []) {
    const result = test.results?.at(-1);
    if (!result || ['passed', 'skipped'].includes(result.status)) continue;
    const error = mask(stripAnsi((result.errors ?? []).map((e) => e.message ?? '').join('\n\n'))).slice(0, 3000);
    const images = [];
    for (const attachment of result.attachments ?? []) {
      if (attachment.contentType !== 'image/png' || !attachment.path || !existsSync(attachment.path)) continue;
      const name = `${failures.length + 1}-${images.length + 1}.png`;
      copyFileSync(attachment.path, join(outDir, 'img', name));
      images.push(name);
    }
    // "Site offline" note added by fixtures/test.ts when the site showed its maintenance page.
    const offline = [...(result.annotations ?? []), ...(test.annotations ?? [])]
      .find((annotation) => annotation.type === 'Site offline');
    failures.push({ title: spec.title, file: spec.file, project: test.projectName, error, images, offline: offline?.description });
  }
}

const stats = results.stats ?? {};
const summary = `Passed: ${stats.expected ?? 0} | Failed: ${stats.unexpected ?? 0} | Flaky: ${stats.flaky ?? 0} | Skipped: ${stats.skipped ?? 0}`;
const body = failures.length
  ? failures.map((f) => `
  <section>
    <h2>${escapeHtml(f.title)}</h2>
    <p class="meta">${escapeHtml(f.file)} · ${escapeHtml(f.project ?? '')}</p>
    ${f.offline ? `<p class="offline">Site offline: ${escapeHtml(f.offline)}</p>` : ''}
    <pre>${escapeHtml(f.error || 'No error message.')}</pre>
    ${f.images.map((img) => `<a href="img/${img}"><img src="img/${img}" alt="Screenshot of ${escapeHtml(f.title)}"></a>`).join('\n    ') || '<p class="meta">No screenshot.</p>'}
  </section>`).join('\n')
  : '<p>All tests passed. No failures to show.</p>';

writeFileSync(join(outDir, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Test Failures</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0 auto; max-width: 1100px; padding: 16px; color: #1f2328; background: #fff; }
  h1 { font-size: 22px; } h2 { font-size: 18px; margin-bottom: 4px; }
  .meta { color: #59636e; font-size: 13px; margin-top: 0; }
  section { border-top: 1px solid #d1d9e0; padding-top: 12px; margin-top: 20px; }
  pre { background: #f6f8fa; padding: 12px; overflow-x: auto; white-space: pre-wrap; font-size: 13px; }
  .offline { background: #fff8c5; border: 1px solid #d4a72c; padding: 8px 12px; }
  img { max-width: 100%; border: 1px solid #d1d9e0; margin-top: 8px; }
</style>
</head>
<body>
<h1>Playwright test failures</h1>
<p>${escapeHtml(summary)}</p>
<p class="meta">Screenshots and errors only (passwords masked). The full report with traces is in the run's playwright-report artifact.</p>
${body}
</body>
</html>
`);
console.log(`Wrote ${join(outDir, 'index.html')}: ${failures.length} failed test(s), ${secrets.length} secret value(s) masked.`);
