/**
 * Patch for @angular/ssr@21.2.0 bug:
 * `this.manifest.allowedHosts` is undefined in the generated manifest, but
 * AngularServerApp constructor spreads it without a nullish fallback, causing
 * "this.manifest.allowedHosts is not iterable" during build-time route extraction.
 *
 * Upstream issue: manifest.js does not emit `allowedHosts` in manifestContent.
 * Fix: add nullish coalescing so an absent field defaults to [].
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../node_modules/@angular/ssr/fesm2022/ssr.mjs');

if (!fs.existsSync(file)) {
  console.log('patch-ssr: @angular/ssr/fesm2022/ssr.mjs not found — skipping');
  process.exit(0);
}

const original = '...this.manifest.allowedHosts';
const replacement = '...(this.manifest.allowedHosts ?? [])';

const content = fs.readFileSync(file, 'utf8');

if (content.includes(replacement)) {
  console.log('patch-ssr: already patched — skipping');
  process.exit(0);
}

if (!content.includes(original)) {
  console.log('patch-ssr: pattern not found — may have been fixed upstream, skipping');
  process.exit(0);
}

fs.writeFileSync(file, content.replace(original, replacement));
console.log('patch-ssr: patched ssr.mjs (allowedHosts nullish fallback)');
