import { describe, expect, it } from 'vitest';
import { buildProjectUpdate } from '../services/db.js';

const NOW = '2026-07-25T00:00:00.000Z';

describe('buildProjectUpdate', () => {
  it('writes only the columns the caller passed', () => {
    const statement = buildProjectUpdate({ id: 'p1', is_favorite: true }, NOW);

    expect(statement).not.toBeNull();
    expect(statement!.sql).toBe(
      'UPDATE projects SET is_favorite = ?, updated_at = ? WHERE id = ?'
    );
    expect(statement!.values).toEqual([1, NOW, 'p1']);
  });

  it('leaves nullable columns alone when they are absent', () => {
    // The regression: a favorite toggle used to null out group_id, website_url
    // and repository_url because they were assigned unconditionally.
    const sql = buildProjectUpdate({ id: 'p1', last_opened_at: NOW }, NOW)!.sql;

    expect(sql).not.toContain('group_id');
    expect(sql).not.toContain('website_url');
    expect(sql).not.toContain('repository_url');
  });

  it('still clears a nullable column when null is passed explicitly', () => {
    const statement = buildProjectUpdate({ id: 'p1', website_url: null }, NOW)!;

    expect(statement.sql).toContain('website_url = ?');
    expect(statement.values).toEqual([null, NOW, 'p1']);
  });

  it('converts booleans to the integers SQLite stores', () => {
    const statement = buildProjectUpdate(
      { id: 'p1', is_favorite: false, is_archived: true, is_missing: false },
      NOW
    )!;

    expect(statement.values.slice(0, 3)).toEqual([0, 1, 0]);
  });

  it('ignores keys that are not updatable columns', () => {
    const statement = buildProjectUpdate(
      { id: 'p1', name: 'renamed', created_at: 'hacked' } as never,
      NOW
    )!;

    expect(statement.sql).toBe('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?');
  });

  it('returns null when there is nothing to write', () => {
    expect(buildProjectUpdate({ id: 'p1' }, NOW)).toBeNull();
  });
});
