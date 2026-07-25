import Database from '@tauri-apps/plugin-sql';
import type { Project, Group, Tag, ScanRoot, AppSettings } from '@git-manager/shared';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:git_manager.db');
  }
  return dbInstance;
}

// ----------------- Projects API -----------------

export async function fetchProjects(): Promise<Project[]> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM projects ORDER BY manual_position ASC, name ASC');
  const tagsMap = await fetchAllProjectTagsMap();

  return rows.map((r) => ({
    id: r.id,
    path: r.path,
    normalized_path: r.normalized_path,
    name: r.name,
    group_id: r.group_id,
    manual_position: Number(r.manual_position || 0),
    website_url: r.website_url,
    repository_url: r.repository_url,
    remote_origin: r.remote_origin,
    icon_source: r.icon_source,
    icon_cache_path: r.icon_cache_path,
    is_favorite: Boolean(r.is_favorite),
    is_archived: Boolean(r.is_archived),
    is_missing: Boolean(r.is_missing),
    last_opened_at: r.last_opened_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    tags: tagsMap[r.id] || [],
  }));
}

export async function upsertScanProjects(discovered: any[]): Promise<{ added: number; updated: number }> {
  const db = await getDb();
  const existing = await fetchProjects();
  const existingMap = new Map(existing.map((p) => [p.normalized_path, p]));

  let added = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const item of discovered) {
    const prev = existingMap.get(item.normalized_path);
    if (prev) {
      // Update existing record, preserving manual position, custom name, group, favorite, tags
      await db.execute(
        `UPDATE projects SET
          path = $1,
          is_missing = 0,
          remote_origin = COALESCE($2, remote_origin),
          repository_url = COALESCE($3, repository_url),
          website_url = COALESCE(website_url, $4),
          updated_at = $5
        WHERE id = $6`,
        [
          item.path,
          item.remote_origin || null,
          item.repository_url || null,
          item.website_url || null,
          now,
          prev.id,
        ]
      );
      updated++;
    } else {
      // Insert new project record into Unassigned
      const id = crypto.randomUUID();
      await db.execute(
        `INSERT INTO projects (
          id, path, normalized_path, name, group_id, manual_position,
          website_url, repository_url, remote_origin, icon_source, icon_cache_path,
          is_favorite, is_archived, is_missing, last_opened_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, NULL, NULL, 0, 0, 0, NULL, $9, $9)`,
        [
          id,
          item.path,
          item.normalized_path,
          item.name,
          existing.length + added,
          item.website_url || null,
          item.repository_url || null,
          item.remote_origin || null,
          now,
        ]
      );
      added++;
    }
  }

  return { added, updated };
}

export async function updateProject(project: Partial<Project> & { id: string }): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE projects SET
      name = COALESCE($1, name),
      path = COALESCE($2, path),
      group_id = $3,
      website_url = $4,
      repository_url = $5,
      icon_source = COALESCE($6, icon_source),
      icon_cache_path = COALESCE($7, icon_cache_path),
      is_favorite = COALESCE($8, is_favorite),
      is_archived = COALESCE($9, is_archived),
      is_missing = COALESCE($10, is_missing),
      last_opened_at = COALESCE($11, last_opened_at),
      manual_position = COALESCE($12, manual_position),
      updated_at = $13
    WHERE id = $14`,
    [
      project.name ?? null,
      project.path ?? null,
      project.group_id ?? null,
      project.website_url ?? null,
      project.repository_url ?? null,
      project.icon_source ?? null,
      project.icon_cache_path ?? null,
      project.is_favorite !== undefined ? (project.is_favorite ? 1 : 0) : null,
      project.is_archived !== undefined ? (project.is_archived ? 1 : 0) : null,
      project.is_missing !== undefined ? (project.is_missing ? 1 : 0) : null,
      project.last_opened_at ?? null,
      project.manual_position !== undefined ? project.manual_position : null,
      now,
      project.id,
    ]
  );
}

export async function deleteProjectFromDb(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM project_tags WHERE project_id = $1', [id]);
  await db.execute('DELETE FROM projects WHERE id = $1', [id]);
}

export async function updateProjectPositions(orders: { id: string; position: number }[]): Promise<void> {
  const db = await getDb();
  for (const item of orders) {
    await db.execute('UPDATE projects SET manual_position = $1 WHERE id = $2', [item.position, item.id]);
  }
}

export async function relinkProjectPath(id: string, newPath: string, normalizedPath: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    'UPDATE projects SET path = $1, normalized_path = $2, is_missing = 0, updated_at = $3 WHERE id = $4',
    [newPath, normalizedPath, now, id]
  );
}

export async function setMissingStatusForUnseen(seenNormalizedPaths: Set<string>): Promise<void> {
  const db = await getDb();
  const projects = await fetchProjects();
  for (const p of projects) {
    if (!seenNormalizedPaths.has(p.normalized_path)) {
      await db.execute('UPDATE projects SET is_missing = 1 WHERE id = $1', [p.id]);
    }
  }
}

// ----------------- Groups API -----------------

export async function fetchGroups(): Promise<Group[]> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM groups ORDER BY position ASC, name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    position: Number(r.position || 0),
    is_collapsed: Boolean(r.is_collapsed),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function saveGroup(group: Partial<Group> & { name: string; color: string }): Promise<Group> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = group.id || crypto.randomUUID();

  if (group.id) {
    await db.execute(
      'UPDATE groups SET name = $1, color = $2, is_collapsed = $3, updated_at = $4 WHERE id = $5',
      [group.name, group.color, group.is_collapsed ? 1 : 0, now, group.id]
    );
  } else {
    const existing = await fetchGroups();
    await db.execute(
      'INSERT INTO groups (id, name, color, position, is_collapsed, created_at, updated_at) VALUES ($1, $2, $3, $4, 0, $5, $5)',
      [id, group.name, group.color, existing.length, now]
    );
  }

  return {
    id,
    name: group.name,
    color: group.color,
    position: group.position || 0,
    is_collapsed: Boolean(group.is_collapsed),
    created_at: now,
    updated_at: now,
  };
}

export async function deleteGroup(groupId: string): Promise<void> {
  const db = await getDb();
  // Move projects to Unassigned (group_id = NULL)
  await db.execute('UPDATE projects SET group_id = NULL WHERE group_id = $1', [groupId]);
  await db.execute('DELETE FROM groups WHERE id = $1', [groupId]);
}

export async function updateGroupPositions(orders: { id: string; position: number }[]): Promise<void> {
  const db = await getDb();
  for (const item of orders) {
    await db.execute('UPDATE groups SET position = $1 WHERE id = $2', [item.position, item.id]);
  }
}

// ----------------- Tags API -----------------

export async function fetchTags(): Promise<Tag[]> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM tags ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function saveTag(tag: Partial<Tag> & { name: string; color: string }): Promise<Tag> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = tag.id || crypto.randomUUID();

  if (tag.id) {
    await db.execute('UPDATE tags SET name = $1, color = $2, updated_at = $3 WHERE id = $4', [
      tag.name,
      tag.color,
      now,
      tag.id,
    ]);
  } else {
    await db.execute('INSERT INTO tags (id, name, color, created_at, updated_at) VALUES ($1, $2, $3, $4, $4)', [
      id,
      tag.name,
      tag.color,
      now,
    ]);
  }

  return { id, name: tag.name, color: tag.color, created_at: now, updated_at: now };
}

export async function deleteTag(tagId: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM project_tags WHERE tag_id = $1', [tagId]);
  await db.execute('DELETE FROM tags WHERE id = $1', [tagId]);
}

export async function setProjectTags(projectId: string, tagIds: string[]): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM project_tags WHERE project_id = $1', [projectId]);
  for (const tagId of tagIds) {
    await db.execute('INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES ($1, $2)', [projectId, tagId]);
  }
}

async function fetchAllProjectTagsMap(): Promise<Record<string, Tag[]>> {
  const db = await getDb();
  const rows = await db.select<any[]>(
    `SELECT pt.project_id, t.* FROM project_tags pt JOIN tags t ON pt.tag_id = t.id`
  );
  const map: Record<string, Tag[]> = {};
  for (const r of rows) {
    if (!map[r.project_id]) map[r.project_id] = [];
    map[r.project_id].push({
      id: r.id,
      name: r.name,
      color: r.color,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
  }
  return map;
}

// ----------------- Scan Roots API -----------------

export async function fetchScanRoots(): Promise<ScanRoot[]> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM scan_roots ORDER BY created_at ASC');
  return rows.map((r) => ({
    id: r.id,
    path: r.path,
    normalized_path: r.normalized_path,
    is_enabled: Boolean(r.is_enabled),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function addScanRoot(path: string, normalizedPath: string): Promise<ScanRoot> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.execute(
    'INSERT OR REPLACE INTO scan_roots (id, path, normalized_path, is_enabled, created_at, updated_at) VALUES ($1, $2, $3, 1, $4, $4)',
    [id, path, normalizedPath, now]
  );

  return { id, path, normalized_path: normalizedPath, is_enabled: true, created_at: now, updated_at: now };
}

export async function removeScanRoot(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM scan_roots WHERE id = $1', [id]);
}

export async function toggleScanRootEnabled(id: string, isEnabled: boolean): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute('UPDATE scan_roots SET is_enabled = $1, updated_at = $2 WHERE id = $3', [
    isEnabled ? 1 : 0,
    now,
    id,
  ]);
}

// ----------------- Settings API -----------------

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  selected_editor_profile: 'code',
  custom_editor_executable: '',
  custom_editor_args: ['{path}'],
  selected_terminal_profile: 'auto',
  custom_terminal_executable: '',
  custom_terminal_args: ['{path}'],
  check_updates_on_startup: true,
  card_density: 'comfortable',
};

export async function fetchSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT key, value FROM settings');
  const settingsObj = { ...DEFAULT_SETTINGS };

  for (const r of rows) {
    if (r.key in settingsObj) {
      try {
        (settingsObj as any)[r.key] = JSON.parse(r.value);
      } catch {
        (settingsObj as any)[r.key] = r.value;
      }
    }
  }

  return settingsObj;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDb();
  const current = await fetchSettings();
  const updated = { ...current, ...settings };

  for (const [key, val] of Object.entries(updated)) {
    await db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)', [
      key,
      JSON.stringify(val),
    ]);
  }

  return updated;
}
