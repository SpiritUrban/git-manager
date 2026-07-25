import { describe, it, expect } from 'vitest';
import { normalizeRemoteUrl, isValidHttpUrl, getFallbackInitials } from '../url-utils.js';

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
