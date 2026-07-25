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
