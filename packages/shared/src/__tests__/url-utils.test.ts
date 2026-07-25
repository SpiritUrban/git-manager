import { describe, it, expect } from 'vitest';
import {
  normalizeRemoteUrl,
  isValidHttpUrl,
  getFallbackInitials,
  resolveRepositoryUrl,
  describeRepositoryUrl,
  pointsAtRepository,
  isInfrastructureUrl,
} from '../url-utils.js';

describe('resolveRepositoryUrl', () => {
  it('prefers the stored repository URL', () => {
    expect(
      resolveRepositoryUrl({
        repository_url: 'https://github.com/owner/repo',
        remote_origin: 'git@gitlab.com:other/thing.git',
      })
    ).toBe('https://github.com/owner/repo');
  });

  it('derives one from the raw remote when the stored URL is missing', () => {
    expect(
      resolveRepositoryUrl({
        repository_url: null,
        remote_origin: 'git@github.com:SpiritUrban/git-manager.git',
      })
    ).toBe('https://github.com/SpiritUrban/git-manager');
  });

  it('ignores a stored value that is not a usable http URL', () => {
    expect(
      resolveRepositoryUrl({
        repository_url: '   ',
        remote_origin: 'https://github.com/owner/repo.git',
      })
    ).toBe('https://github.com/owner/repo');
  });

  it('returns null for a project with no remote at all', () => {
    expect(resolveRepositoryUrl({ repository_url: null, remote_origin: null })).toBeNull();
    expect(resolveRepositoryUrl({})).toBeNull();
  });
});

describe('isInfrastructureUrl', () => {
  it('flags managed backend endpoints', () => {
    expect(isInfrastructureUrl('https://lrodjzakzfqgdcjazdty.supabase.co')).toBe(true);
    expect(isInfrastructureUrl('https://cluster0.mongodb.net/db')).toBe(true);
    expect(isInfrastructureUrl('https://org.sentry.io')).toBe(true);
    expect(isInfrastructureUrl('https://bucket.s3.eu-central-1.amazonaws.com')).toBe(true);
  });

  it('leaves ordinary sites alone', () => {
    expect(isInfrastructureUrl('https://my-transfer.com.ua')).toBe(false);
    expect(isInfrastructureUrl('https://spiriturban.github.io/books-online')).toBe(false);
    // A lookalike that is not actually on the backend host.
    expect(isInfrastructureUrl('https://supabase.co.my-site.dev')).toBe(false);
  });

  it('is false for missing or unparsable input', () => {
    expect(isInfrastructureUrl(null)).toBe(false);
    expect(isInfrastructureUrl('not a url')).toBe(false);
  });
});

describe('pointsAtRepository', () => {
  it('flags the npm init homepage default', () => {
    expect(
      pointsAtRepository(
        'https://github.com/SpiritUrban/cheknis#readme',
        'https://github.com/SpiritUrban/cheknis'
      )
    ).toBe(true);
  });

  it('flags any code-host URL even without a repository to compare against', () => {
    expect(pointsAtRepository('https://gitlab.com/group/project', null)).toBe(true);
    expect(pointsAtRepository('https://bitbucket.org/user/repo', undefined)).toBe(true);
  });

  it('leaves a real website alone', () => {
    expect(
      pointsAtRepository('https://my-transfer.com.ua', 'https://github.com/owner/repo')
    ).toBe(false);
    // github.io is a site, not a code host.
    expect(pointsAtRepository('https://spiriturban.github.io/books-online/', null)).toBe(false);
  });

  it('is false for a missing or unparsable website', () => {
    expect(pointsAtRepository(null, 'https://github.com/owner/repo')).toBe(false);
    expect(pointsAtRepository('not a url', 'https://github.com/owner/repo')).toBe(false);
  });
});

describe('describeRepositoryUrl', () => {
  it('renders host and path without the www prefix', () => {
    expect(describeRepositoryUrl('https://www.github.com/owner/repo')).toBe(
      'github.com · owner/repo'
    );
  });

  it('falls back to the raw string when the URL will not parse', () => {
    expect(describeRepositoryUrl('not a url')).toBe('not a url');
  });
});

describe('url-utils', () => {
  describe('normalizeRemoteUrl', () => {
    it('normalizes SSH URLs to HTTPS browser URLs', () => {
      expect(normalizeRemoteUrl('git@github.com:SpiritUrban/git-manager.git')).toBe(
        'https://github.com/SpiritUrban/git-manager'
      );
      expect(normalizeRemoteUrl('git@gitlab.com:group/project.git')).toBe(
        'https://gitlab.com/group/project'
      );
      expect(normalizeRemoteUrl('git@bitbucket.org:user/repo.git')).toBe(
        'https://bitbucket.org/user/repo'
      );
    });

    it('handles ssh:// protocol format', () => {
      expect(normalizeRemoteUrl('ssh://git@github.com/owner/repo.git')).toBe(
        'https://github.com/owner/repo'
      );
    });

    it('strips .git suffix and credentials from HTTPS URLs', () => {
      expect(normalizeRemoteUrl('https://github.com/owner/repo.git')).toBe(
        'https://github.com/owner/repo'
      );
      expect(normalizeRemoteUrl('https://user:pass@github.com/owner/repo.git')).toBe(
        'https://github.com/owner/repo'
      );
    });

    it('returns null for empty or invalid remote strings', () => {
      expect(normalizeRemoteUrl('')).toBeNull();
      expect(normalizeRemoteUrl(null)).toBeNull();
      expect(normalizeRemoteUrl('not-a-valid-url')).toBeNull();
    });
  });

  describe('isValidHttpUrl', () => {
    it('validates http and https protocols', () => {
      expect(isValidHttpUrl('https://example.com')).toBe(true);
      expect(isValidHttpUrl('http://localhost:3000')).toBe(true);
      expect(isValidHttpUrl('ftp://files.com')).toBe(false);
      expect(isValidHttpUrl('file:///C:/path')).toBe(false);
      expect(isValidHttpUrl('invalid')).toBe(false);
      expect(isValidHttpUrl('')).toBe(false);
    });
  });

  describe('getFallbackInitials', () => {
    it('generates 2-character initials for multi-word or hyphenated names', () => {
      expect(getFallbackInitials('git-manager')).toBe('GM');
      expect(getFallbackInitials('My Awesome Project')).toBe('MA');
      expect(getFallbackInitials('react_app')).toBe('RA');
    });

    it('generates initials for single-word names', () => {
      expect(getFallbackInitials('Desktop')).toBe('DE');
    });

    it('defaults to GM for empty strings', () => {
      expect(getFallbackInitials('')).toBe('GM');
    });
  });
});
