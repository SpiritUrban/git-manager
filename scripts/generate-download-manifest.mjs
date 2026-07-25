import fs from 'fs';
import path from 'path';

const owner = 'SpiritUrban';
const repo = 'git-manager';

const outDir = 'apps/site/public';
const outFile = path.join(outDir, 'download-manifest.json');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function generateManifest() {
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Git-Manager-Site-Builder' },
    });

    if (!res.ok) {
      console.warn(`GitHub API returned ${res.status}. Falling back to clean default manifest state.`);
      writeFallbackManifest();
      return;
    }

    const data = await res.json();
    const manifest = {
      version: data.tag_name ? data.tag_name.replace(/^v/, '') : '0.1.0',
      publishedAt: data.published_at || new Date().toISOString(),
      releasePageUrl: data.html_url || `https://github.com/${owner}/${repo}/releases`,
      releaseNotes: data.body || '',
      assets: (data.assets || []).map((asset) => {
        let platform = 'windows';
        if (asset.name.includes('macos') || asset.name.includes('darwin') || asset.name.endsWith('.dmg')) {
          platform = 'macos';
        } else if (asset.name.includes('linux') || asset.name.endsWith('.AppImage') || asset.name.endsWith('.deb')) {
          platform = 'linux';
        }

        let architecture = 'x64';
        if (asset.name.includes('arm64') || asset.name.includes('aarch64')) {
          architecture = 'arm64';
        }

        return {
          platform,
          architecture,
          fileName: asset.name,
          fileSize: asset.size,
          downloadUrl: asset.browser_download_url,
        };
      }),
    };

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
  const fallback = {
    version: '0.1.0',
    publishedAt: new Date().toISOString(),
    releasePageUrl: `https://github.com/${owner}/${repo}/releases`,
    releaseNotes: 'No published release yet.',
    assets: [],
  };

  fs.writeFileSync(outFile, JSON.stringify(fallback, null, 2) + '\n');
  console.log(`Wrote default fallback manifest to ${outFile}`);
}

generateManifest();
