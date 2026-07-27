import fs from 'fs';
import path from 'path';

// Same module the site uses at runtime, so the two can never classify an asset
// differently. It is plain JavaScript precisely so this script can import it.
import { buildDownloadManifest } from '../packages/shared/src/release-assets.js';

const owner = 'SpiritUrban';
const repo = 'git-manager';

const outDir = 'apps/site/public';
const outFile = path.join(outDir, 'download-manifest.json');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function generateManifest() {
  try {
    // When this runs as part of a release, ask for that exact tag. "latest" is
    // resolved by GitHub and there is no guarantee it already points at the
    // release the run just produced.
    const ref = process.env.GITHUB_REF_NAME || '';
    const isTag = /^v\d+\.\d+\.\d+$/.test(ref);
    const apiUrl = isTag
      ? `https://api.github.com/repos/${owner}/${repo}/releases/tags/${ref}`
      : `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    console.log(`Resolving release from ${isTag ? `tag ${ref}` : 'latest'}`);

    // Unauthenticated calls get 60 requests per hour per IP; exhausting that
    // returns 403 and would silently leave the site with no download links.
    const headers = { 'User-Agent': 'Git-Manager-Site-Builder' };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
      console.warn(`GitHub API returned ${res.status}. Falling back to clean default manifest state.`);
      writeFallbackManifest();
      return;
    }

    const manifest = buildDownloadManifest(await res.json());
    fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Generated download manifest at ${outFile}`);
  } catch (err) {
    console.warn(`Failed to fetch GitHub release metadata: ${err.message}. Writing fallback state.`);
    writeFallbackManifest();
  }
}

// Emitted when no published release exists yet. Listing invented asset names
// here would give the site download links that 404; an empty list makes it fall
// back to the releases page instead.
function writeFallbackManifest() {
  // Read the version rather than hardcoding it: a literal here silently goes
  // stale on every release and would advertise a version that does not exist.
  const rootVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  const fallback = {
    version: rootVersion,
    publishedAt: new Date().toISOString(),
    releasePageUrl: `https://github.com/${owner}/${repo}/releases`,
    releaseNotes: 'No published release yet.',
    assets: [],
  };

  fs.writeFileSync(outFile, JSON.stringify(fallback, null, 2) + '\n');
  console.log(`Wrote default fallback manifest to ${outFile}`);
}

generateManifest();
