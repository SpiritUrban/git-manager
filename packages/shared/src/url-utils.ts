/**
  * Normalizes Git remote origin URLs (e.g., SSH or HTTPS) into valid browser HTTPS URLs
 * for GitHub, GitLab, Bitbucket, and custom web hosts.
 */
export function normalizeRemoteUrl(remote: string | null | undefined): string | null {
  if (!remote) return null;
  const trimmed = remote.trim();
  if (!trimmed) return null;

  // Handle SSH format git@host:owner/repo.git
  const sshRegex = /^git@([^:]+):(.+?)(?:\.git)?$/;
  const sshMatch = trimmed.match(sshRegex);
  if (sshMatch) {
    const [, host, path] = sshMatch;
    return `https://${host}/${path.replace(/\.git$/, '')}`;
  }

  // Handle ssh://git@host/owner/repo.git
  const sshProtocolRegex = /^ssh:\/\/git@([^/]+)\/(.+?)(?:\.git)?$/;
  const sshProtocolMatch = trimmed.match(sshProtocolRegex);
  if (sshProtocolMatch) {
    const [, host, path] = sshProtocolMatch;
    return `https://${host}/${path.replace(/\.git$/, '')}`;
  }

  // Handle HTTPS format https://host/owner/repo.git
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      url.pathname = url.pathname.replace(/\.git$/, '');
      // Strip credentials if present
      url.username = '';
      url.password = '';
      return url.toString();
    } catch {
      return trimmed.replace(/\.git$/, '');
    }
  }

  return null;
}

/**
 * Validates whether a URL string starts with http:// or https://
 */
export function isValidHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The browsable repository page for a project.
 *
 * Prefers the normalized URL stored at scan time, but falls back to deriving one
 * from the raw git remote — projects added before the scanner stored
 * `repository_url`, or added by hand, only have `remote_origin`.
 */
export function resolveRepositoryUrl(project: {
  repository_url?: string | null;
  remote_origin?: string | null;
}): string | null {
  if (isValidHttpUrl(project.repository_url)) {
    return project.repository_url!.trim();
  }
  return normalizeRemoteUrl(project.remote_origin);
}

/**
 * Host suffixes belonging to managed backends. Mirrors `INFRA_HOST_SUFFIXES` in
 * `src-tauri/src/services/website.rs`; the Rust list stops such a URL from being
 * detected, this one repairs values stored before that check existed.
 */
const INFRASTRUCTURE_HOST_SUFFIXES = [
  '.supabase.co',
  '.supabase.in',
  '.firebaseio.com',
  '.firebasedatabase.app',
  '.mongodb.net',
  '.documents.azure.com',
  '.amazonaws.com',
  '.upstash.io',
  '.neon.tech',
  '.planetscale.com',
  '.turso.io',
  '.cockroachlabs.cloud',
  '.clickhouse.cloud',
  '.elastic-cloud.com',
  '.sentry.io',
  '.redislabs.com',
  '.pusher.com',
  '.algolia.net',
];

/**
 * True when a URL points at a managed backend rather than a website.
 *
 * A database or error-tracking endpoint is never what the website button should
 * open, so a stored value like `https://<ref>.supabase.co` is wrong regardless
 * of how it got there.
 */
export function isInfrastructureUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return INFRASTRUCTURE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

/**
 * True when a stored website URL is really just the repository link.
 *
 * `npm init` defaults `homepage` to `https://github.com/owner/repo#readme`, and
 * the scanner used to copy that into `website_url` — which makes the website
 * button a duplicate of the repository button rather than a link to a site.
 */
export function pointsAtRepository(
  websiteUrl: string | null | undefined,
  repositoryUrl: string | null | undefined
): boolean {
  if (!websiteUrl) return false;

  const key = (raw: string): string | null => {
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      const path = parsed.pathname.replace(/\/+$/, '').toLowerCase();
      return `${host}${path}`;
    } catch {
      return null;
    }
  };

  const site = key(websiteUrl);
  if (!site) return false;

  // Any URL on a code host is a repository link, not a website.
  const CODE_HOSTS = ['github.com/', 'gitlab.com/', 'bitbucket.org/', 'codeberg.org/'];
  if (CODE_HOSTS.some((host) => site.startsWith(host))) return true;

  const repo = repositoryUrl ? key(repositoryUrl) : null;
  return repo !== null && site === repo;
}

/**
 * Short host label for a repository URL, e.g. "github.com · owner/repo".
 */
export function describeRepositoryUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/|\/$/g, '');
    const host = parsed.hostname.replace(/^www\./, '');
    return path ? `${host} · ${path}` : host;
  } catch {
    return url;
  }
}

/**
 * Extracts fallback initials from a repository/project name.
 */
export function getFallbackInitials(name: string): string {
  if (!name) return 'GM';
  const clean = name.replace(/[^a-zA-Z0-9\s_-]/g, '').trim();
  if (!clean) return 'GM';

  const parts = clean.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
