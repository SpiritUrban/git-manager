// Plain JavaScript on purpose: the build-time manifest generator is a bare node
// script and cannot import TypeScript, while the site needs the very same rules.
// Types live in release-assets.d.ts so consumers still get them.

/**
 * Updater signatures and the updater manifest ride along in every signed
 * release but are not downloadable builds.
 */
export function isDistributableAsset(name) {
  const n = name.toLowerCase();
  return !n.endsWith('.sig') && n !== 'latest.json';
}

/**
 * Tauri names bundles after productName, so the platform cannot be read from a
 * word in the file name: "Git.Manager-0.1.3-1.x86_64.rpm" and
 * "Git.Manager_aarch64.app.tar.gz" carry none. The extension does carry it.
 */
export function classifyReleaseAsset(name) {
  const n = name.toLowerCase();

  let platform = 'windows';
  if (
    n.includes('macos') ||
    n.includes('darwin') ||
    n.endsWith('.dmg') ||
    n.endsWith('.app.tar.gz')
  ) {
    platform = 'macos';
  } else if (
    n.includes('linux') ||
    n.endsWith('.appimage') ||
    n.endsWith('.deb') ||
    n.endsWith('.rpm')
  ) {
    platform = 'linux';
  }

  const architecture = n.includes('arm64') || n.includes('aarch64') ? 'arm64' : 'x64';

  return { platform, architecture };
}

/** Turns a GitHub release payload into the manifest shape the site renders. */
export function buildDownloadManifest(release) {
  return {
    version: release.tag_name ? release.tag_name.replace(/^v/, '') : '',
    publishedAt: release.published_at || new Date().toISOString(),
    releasePageUrl: release.html_url || '',
    releaseNotes: release.body || '',
    assets: (release.assets || [])
      .filter((asset) => isDistributableAsset(asset.name))
      .map((asset) => ({
        ...classifyReleaseAsset(asset.name),
        fileName: asset.name,
        fileSize: asset.size,
        downloadUrl: asset.browser_download_url,
      })),
  };
}
