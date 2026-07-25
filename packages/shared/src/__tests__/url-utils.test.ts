import { describe, it, expect } from 'vitest';
import {
  normalizeRemoteUrl,
  isValidHttpUrl,
  getFallbackInitials,
  resolveRepositoryUrl,
  describeRepositoryUrl,
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
