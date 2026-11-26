#!/usr/bin/env node
/**
 * Works out the version number for the next release.
 *
 *   node scripts/next-version.mjs <version in app.json> [existing release tags...]
 *
 * Rules:
 *   - No releases yet: use the version in app.json as it is.
 *   - app.json is ahead of every release (someone raised it by hand, say to 1.1.0 or 2.0.0):
 *     use the app.json version.
 *   - Otherwise: take the highest released version and add one to its last number, so
 *     1.0.0 is followed by 1.0.1, 1.0.2 and so on.
 *
 * Tags are read by their leading "v1.2.3"; anything after that (such as "-build.2") is ignored,
 * and tags that are not version numbers are skipped.
 */

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)/;

/** "v1.2.3-anything" -> [1, 2, 3], or null when the text is not a version. */
export function parseVersion(text) {
  const match = VERSION.exec(String(text).trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function compare(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

export function nextVersion(configured, tags) {
  const base = parseVersion(configured);
  if (!base) {
    throw new Error(`The version in app.json ("${configured}") is not in the form 1.2.3.`);
  }
  const released = tags.map(parseVersion).filter((v) => v !== null);
  if (released.length === 0) return base.join('.');

  const latest = released.reduce((highest, v) => (compare(v, highest) > 0 ? v : highest));
  if (compare(base, latest) > 0) return base.join('.');
  return [latest[0], latest[1], latest[2] + 1].join('.');
}

// Run from the command line (not when imported by a test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const [configured, ...tags] = process.argv.slice(2);
  try {
    process.stdout.write(`${nextVersion(configured ?? '', tags)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
