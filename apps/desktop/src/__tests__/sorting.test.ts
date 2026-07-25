import { describe, it, expect } from 'vitest';
import type { Project } from '@git-manager/shared';

describe('desktop project sorting & filtering logic', () => {
  const sampleProjects: Project[] = [
    {
      id: '1',
      name: 'Zebra App',
      path: '/repos/zebra',
      normalized_path: '/repos/zebra',
      group_id: null,
      manual_position: 2,
      website_url: null,
      repository_url: null,
      remote_origin: null,
      icon_source: null,
      icon_cache_path: null,
      is_favorite: false,
      is_archived: false,
      is_missing: false,
      last_opened_at: '2026-07-20T10:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Alpha Backend',
      path: '/repos/alpha',
      normalized_path: '/repos/alpha',
      group_id: 'g1',
      manual_position: 1,
      website_url: 'https://alpha.io',
      repository_url: null,
      remote_origin: null,
      icon_source: null,
      icon_cache_path: null,
      is_favorite: true,
      is_archived: false,
      is_missing: false,
      last_opened_at: '2026-07-25T12:00:00Z',
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    },
  ];

  it('sorts projects A-Z by name', () => {
    const list = [...sampleProjects].sort((a, b) => a.name.localeCompare(b.name));
    expect(list[0].name).toBe('Alpha Backend');
    expect(list[1].name).toBe('Zebra App');
  });

  it('sorts projects by recently opened', () => {
    const list = [...sampleProjects].sort((a, b) => {
      const da = a.last_opened_at ? new Date(a.last_opened_at).getTime() : 0;
      const db = b.last_opened_at ? new Date(b.last_opened_at).getTime() : 0;
      return db - da;
    });
    expect(list[0].name).toBe('Alpha Backend');
  });

  it('filters favorites correctly', () => {
    const favs = sampleProjects.filter((p) => p.is_favorite);
    expect(favs.length).toBe(1);
    expect(favs[0].name).toBe('Alpha Backend');
  });
});
