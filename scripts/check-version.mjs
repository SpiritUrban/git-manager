import fs from 'fs';

const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const expectedVersion = rootPkg.version;

const filesToCheck = [
  'apps/desktop/package.json',
  'apps/site/package.json',
  'packages/shared/package.json',
  'packages/ui/package.json',
  'packages/config/package.json',
  'apps/desktop/src-tauri/tauri.conf.json',
];

let hasMismatch = false;

for (const f of filesToCheck) {
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (data.version !== expectedVersion) {
      console.error(`Version mismatch in ${f}: expected "${expectedVersion}", found "${data.version}"`);
      hasMismatch = true;
    }
  }
}

// Check Cargo.toml
const cargoContent = fs.readFileSync('apps/desktop/src-tauri/Cargo.toml', 'utf8');
const cargoMatch = cargoContent.match(/^version = "([^"]+)"/m);
if (cargoMatch && cargoMatch[1] !== expectedVersion) {
  console.error(`Version mismatch in Cargo.toml: expected "${expectedVersion}", found "${cargoMatch[1]}"`);
  hasMismatch = true;
}

// Check git tag if running in GitHub Actions release workflow
const tagRef = process.env.GITHUB_REF_NAME;
if (tagRef && tagRef.startsWith('v')) {
  const tagVersion = tagRef.replace(/^v/, '');
  if (tagVersion !== expectedVersion) {
    console.error(`Release tag mismatch: tag is "${tagRef}" (${tagVersion}), but root package version is "${expectedVersion}"`);
    hasMismatch = true;
  }
}

if (hasMismatch) {
  console.error('\nVersion validation failed! Please run "pnpm release:prepare <version>" to sync version strings.');
  process.exit(1);
} else {
  console.log(`All versions consistently matched expected: ${expectedVersion}`);
}
