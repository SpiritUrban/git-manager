import fs from 'fs';
import path from 'path';

const targetVersion = process.argv[2];

if (!targetVersion) {
  console.error('Usage: node scripts/sync-version.mjs <version>');
  process.exit(1);
}

// Clean version string (remove leading 'v' if present)
const version = targetVersion.replace(/^v/, '');

const filesToUpdateJson = [
  'package.json',
  'apps/desktop/package.json',
  'apps/site/package.json',
  'packages/shared/package.json',
  'packages/ui/package.json',
  'packages/config/package.json',
];

console.log(`Syncing version to: ${version}`);

for (const relPath of filesToUpdateJson) {
  if (fs.existsSync(relPath)) {
    const pkg = JSON.parse(fs.readFileSync(relPath, 'utf8'));
    pkg.version = version;
    fs.writeFileSync(relPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  Updated ${relPath}`);
  }
}

// Update tauri.conf.json
const tauriConfPath = 'apps/desktop/src-tauri/tauri.conf.json';
if (fs.existsSync(tauriConfPath)) {
  const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  conf.version = version;
  fs.writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2) + '\n');
  console.log(`  Updated ${tauriConfPath}`);
}

// Update Cargo.toml
const cargoPath = 'apps/desktop/src-tauri/Cargo.toml';
if (fs.existsSync(cargoPath)) {
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');
  cargoContent = cargoContent.replace(/^version = "[^"]+"/m, `version = "${version}"`);
  fs.writeFileSync(cargoPath, cargoContent);
  console.log(`  Updated ${cargoPath}`);
}

// Update Cargo.lock. It records the crate's own version and is committed, so
// skipping it would leave the lockfile one release behind. Only the entry for
// this package is touched — dependency resolution is left alone.
const cargoLockPath = 'apps/desktop/src-tauri/Cargo.lock';
if (fs.existsSync(cargoLockPath)) {
  const crateName = 'git-manager-desktop';
  const lock = fs.readFileSync(cargoLockPath, 'utf8');
  const pattern = new RegExp(`(name = "${crateName}"\\r?\\nversion = ")[^"]+(")`);
  if (!pattern.test(lock)) {
    console.error(`  Could not find the ${crateName} entry in ${cargoLockPath}`);
    process.exit(1);
  }
  fs.writeFileSync(cargoLockPath, lock.replace(pattern, `$1${version}$2`));
  console.log(`  Updated ${cargoLockPath}`);
}

console.log('Version synchronization complete.');
