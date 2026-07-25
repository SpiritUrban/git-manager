import Database from '@tauri-apps/plugin-sql';
import type { Project, Group, Tag, ScanRoot, AppSettings } from '@git-manager/shared';

let dbInstance: Database | null = null;
let fallbackMemoryProjects: Project[] = [];
let fallbackMemoryGroups: Group[] = [];
let fallbackMemoryTags: Tag[] = [];
let fallbackMemoryRoots: ScanRoot[] = [];
let isFallbackMode = false;

export async function getDb(): Promise<Database | null> {
  if (isFallbackMode) return null;
  if (!dbInstance) {
    try {
      dbInstance = await Database.load('sqlite:git_manager.db');
    } catch (err) {
      console.warn('SQLite native database load failed or non-Tauri environment. Using memory fallback:', err);
      isFallbackMode = true;
      return null;
    }
  }
  return dbInstance;
}

// ----------------- Projects API -----------------

export async function fetchProjects(): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [...fallbackMemoryProjects];

  try {
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
  } catch (err) {
    console.error('fetchProjects DB error:', err);
    return [...fallbackMemoryProjects];
  }
}

export async function upsertScanProjects(discovered: any[]): Promise<{ added: number; updated: number }> {
  const db = await getDb();
  const existing = await fetchProjects();
  const existingMap = new Map(existing.map((p) => [p.normalized_path, p]));

  let added = 0;
  let updated = 0;
  const now = new Date().toISOString();

  if (!db) {
    for (const item of discovered) {
      const prevIndex = fallbackMemoryProjects.findIndex((p) => p.normalized_path === item.normalized_path);
      if (prevIndex >= 0) {
        fallbackMemoryProjects[prevIndex] = {
          ...fallbackMemoryProjects[prevIndex],
          path: item.path,
          remote_origin: item.remote_origin || fallbackMemoryProjects[prevIndex].remote_origin,
          repository_url: item.repository_url || fallbackMemoryProjects[prevIndex].repository_url,
          website_url: item.website_url || fallbackMemoryProjects[prevIndex].website_url,
          updated_at: now,
        };
        updated++;
      } else {
        const newProj: Project = {
          id: crypto.randomUUID(),
          path: item.path,
          normalized_path: item.normalized_path,
          name: item.name,
          group_id: null,
          manual_position: fallbackMemoryProjects.length + added,
          website_url: item.website_url || null,
          repository_url: item.repository_url || null,
          remote_origin: item.remote_origin || null,
          icon_source: null,
          icon_cache_path: null,
          is_favorite: false,
          is_archived: false,
          is_missing: false,
          last_opened_at: null,
          created_at: now,
          updated_at: now,
          tags: [],
        };
        fallbackMemoryProjects.push(newProj);
        added++;
      }
    }
    return { added, updated };
  }

  for (const item of discovered) {
    const prev = existingMap.get(item.normalized_path);
    if (prev) {
      await db.execute(
        `UPDATE projects SET
          path = ?,
          is_missing = 0,
          remote_origin = COALESCE(?, remote_origin),
          repository_url = COALESCE(?, repository_url),
          website_url = COALESCE(website_url, ?),
          icon_source = COALESCE(?, icon_source),
          icon_cache_path = COALESCE(?, icon_cache_path),
          updated_at = ?
        WHERE id = ?`,
        [
          item.path,
          item.remote_origin || null,
          item.repository_url || null,
          item.website_url || null,
          item.icon_path ? 'local_favicon' : null,
          item.icon_path || null,
          now,
          prev.id,
        ]
      );
      updated++;
    } else {
      const id = crypto.randomUUID();
      await db.execute(
        `INSERT INTO projects (
          id, path, normalized_path, name, group_id, manual_position,
          website_url, repository_url, remote_origin, icon_source, icon_cache_path,
          is_favorite, is_archived, is_missing, last_opened_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 0, 0, 0, NULL, ?, ?)`,
        [
          id,
          item.path,
          item.normalized_path,
          item.name,
          existing.length + added,
          item.website_url || null,
          item.repository_url || null,
          item.remote_origin || null,
          item.icon_path ? 'local_favicon' : null,
          item.icon_path || null,
          now,
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

  if (!db) {
    const idx = fallbackMemoryProjects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      fallbackMemoryProjects[idx] = {
        ...fallbackMemoryProjects[idx],
        ...project,
        updated_at: now,
      };
    }
    return;
  }

  await db.execute(
    `UPDATE projects SET
      name = COALESCE(?, name),
      path = COALESCE(?, path),
      group_id = ?,
      website_url = ?,
      repository_url = ?,
      icon_source = COALESCE(?, icon_source),
      icon_cache_path = COALESCE(?, icon_cache_path),
      is_favorite = COALESCE(?, is_favorite),
      is_archived = COALESCE(?, is_archived),
      is_missing = COALESCE(?, is_missing),
      last_opened_at = COALESCE(?, last_opened_at),
      manual_position = COALESCE(?, manual_position),
      updated_at = ?
    WHERE id = ?`,
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
  if (!db) {
    fallbackMemoryProjects = fallbackMemoryProjects.filter((p) => p.id !== id);
    return;
  }
  await db.execute('DELETE FROM project_tags WHERE project_id = ?', [id]);
  await db.execute('DELETE FROM projects WHERE id = ?', [id]);
}

export async function updateProjectPositions(orders: { id: string; position: number }[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    const map = new Map(orders.map((o) => [o.id, o.position]));
    for (const p of fallbackMemoryProjects) {
      if (map.has(p.id)) p.manual_position = map.get(p.id)!;
    }
    return;
  }
  for (const item of orders) {
    await db.execute('UPDATE projects SET manual_position = ? WHERE id = ?', [item.position, item.id]);
  }
}

export async function relinkProjectPath(id: string, newPath: string, normalizedPath: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  if (!db) {
    const idx = fallbackMemoryProjects.findIndex((p) => p.id === id);
    if (idx >= 0) {
      fallbackMemoryProjects[idx].path = newPath;
      fallbackMemoryProjects[idx].normalized_path = normalizedPath;
      fallbackMemoryProjects[idx].is_missing = false;
      fallbackMemoryProjects[idx].updated_at = now;
    }
    return;
  }
  await db.execute(
    'UPDATE projects SET path = ?, normalized_path = ?, is_missing = 0, updated_at = ? WHERE id = ?',
    [newPath, normalizedPath, now, id]
  );
}

export async function setMissingStatusForUnseen(_seenNormalizedPaths: Set<string>): Promise<void> {
  // Preserves existing projects in DB without falsely marking them missing on single folder scans
}

// ----------------- Groups API -----------------

export async function fetchGroups(): Promise<Group[]> {
  const db = await getDb();
  if (!db) return [...fallbackMemoryGroups];

  try {
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
  } catch (err) {
    console.error('fetchGroups DB error:', err);
    return [...fallbackMemoryGroups];
  }
}

export async function saveGroup(group: Partial<Group> & { name: string; color: string }): Promise<Group> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = group.id || crypto.randomUUID();

  if (!db) {
    const existingIdx = fallbackMemoryGroups.findIndex((g) => g.id === id);
    const newGrp: Group = {
      id,
      name: group.name,
      color: group.color,
      position: group.position || (existingIdx >= 0 ? fallbackMemoryGroups[existingIdx].position : fallbackMemoryGroups.length),
      is_collapsed: Boolean(group.is_collapsed),
      created_at: existingIdx >= 0 ? fallbackMemoryGroups[existingIdx].created_at : now,
      updated_at: now,
    };
    if (existingIdx >= 0) {
      fallbackMemoryGroups[existingIdx] = newGrp;
    } else {
      fallbackMemoryGroups.push(newGrp);
    }
    return newGrp;
  }

  if (group.id) {
    await db.execute(
      'UPDATE groups SET name = ?, color = ?, is_collapsed = ?, updated_at = ? WHERE id = ?',
      [group.name, group.color, group.is_collapsed ? 1 : 0, now, group.id]
    );
  } else {
    const existing = await fetchGroups();
    await db.execute(
      'INSERT INTO groups (id, name, color, position, is_collapsed, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
      [id, group.name, group.color, existing.length, now, now]
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
  if (!db) {
    fallbackMemoryGroups = fallbackMemoryGroups.filter((g) => g.id !== groupId);
    for (const p of fallbackMemoryProjects) {
      if (p.group_id === groupId) p.group_id = null;
    }
    return;
  }
  await db.execute('UPDATE projects SET group_id = NULL WHERE group_id = ?', [groupId]);
  await db.execute('DELETE FROM groups WHERE id = ?', [groupId]);
}

export async function updateGroupPositions(orders: { id: string; position: number }[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    const map = new Map(orders.map((o) => [o.id, o.position]));
    for (const g of fallbackMemoryGroups) {
      if (map.has(g.id)) g.position = map.get(g.id)!;
    }
    return;
  }
  for (const item of orders) {
    await db.execute('UPDATE groups SET position = ? WHERE id = ?', [item.position, item.id]);
  }
}

// ----------------- Tags API -----------------

export async function fetchTags(): Promise<Tag[]> {
  const db = await getDb();
  if (!db) return [...fallbackMemoryTags];

  try {
    const rows = await db.select<any[]>('SELECT * FROM tags ORDER BY name ASC');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (err) {
    console.error('fetchTags DB error:', err);
    return [...fallbackMemoryTags];
  }
}

export async function saveTag(tag: Partial<Tag> & { name: string; color: string }): Promise<Tag> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = tag.id || crypto.randomUUID();

  if (!db) {
    const existingIdx = fallbackMemoryTags.findIndex((t) => t.id === id);
    const newTag: Tag = {
      id,
      name: tag.name,
      color: tag.color,
      created_at: existingIdx >= 0 ? fallbackMemoryTags[existingIdx].created_at : now,
      updated_at: now,
    };
    if (existingIdx >= 0) {
      fallbackMemoryTags[existingIdx] = newTag;
    } else {
      fallbackMemoryTags.push(newTag);
    }
    return newTag;
  }

  if (tag.id) {
    await db.execute('UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ?', [
      tag.name,
      tag.color,
      now,
      tag.id,
    ]);
  } else {
    await db.execute('INSERT INTO tags (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      id,
      tag.name,
      tag.color,
      now,
      now,
    ]);
  }

  return { id, name: tag.name, color: tag.color, created_at: now, updated_at: now };
}

export async function deleteTag(tagId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    fallbackMemoryTags = fallbackMemoryTags.filter((t) => t.id !== tagId);
    return;
  }
  await db.execute('DELETE FROM project_tags WHERE tag_id = ?', [tagId]);
  await db.execute('DELETE FROM tags WHERE id = ?', [tagId]);
}

export async function setProjectTags(projectId: string, tagIds: string[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    const proj = fallbackMemoryProjects.find((p) => p.id === projectId);
    if (proj) {
      proj.tags = fallbackMemoryTags.filter((t) => tagIds.includes(t.id));
    }
    return;
  }
  await db.execute('DELETE FROM project_tags WHERE project_id = ?', [projectId]);
  for (const tagId of tagIds) {
    await db.execute('INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)', [projectId, tagId]);
  }
}

async function fetchAllProjectTagsMap(): Promise<Record<string, Tag[]>> {
  const db = await getDb();
  if (!db) return {};

  try {
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
  } catch (err) {
    console.error('fetchAllProjectTagsMap DB error:', err);
    return {};
  }
}

// ----------------- Scan Roots API -----------------

export async function fetchScanRoots(): Promise<ScanRoot[]> {
  const db = await getDb();
  if (!db) return [...fallbackMemoryRoots];

  try {
    const rows = await db.select<any[]>('SELECT * FROM scan_roots ORDER BY created_at ASC');
    return rows.map((r) => ({
      id: r.id,
      path: r.path,
      normalized_path: r.normalized_path,
      is_enabled: Boolean(r.is_enabled),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (err) {
    console.error('fetchScanRoots DB error:', err);
    return [...fallbackMemoryRoots];
  }
}

export async function addScanRoot(path: string, normalizedPath: string): Promise<ScanRoot> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  if (!db) {
    const newRoot: ScanRoot = { id, path, normalized_path: normalizedPath, is_enabled: true, created_at: now, updated_at: now };
    fallbackMemoryRoots.push(newRoot);
    return newRoot;
  }

  await db.execute(
    'INSERT OR REPLACE INTO scan_roots (id, path, normalized_path, is_enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
    [id, path, normalizedPath, now, now]
  );

  return { id, path, normalized_path: normalizedPath, is_enabled: true, created_at: now, updated_at: now };
}

export async function removeScanRoot(id: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    fallbackMemoryRoots = fallbackMemoryRoots.filter((r) => r.id !== id);
    return;
  }
  await db.execute('DELETE FROM scan_roots WHERE id = ?', [id]);
}

export async function toggleScanRootEnabled(id: string, isEnabled: boolean): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  if (!db) {
    const root = fallbackMemoryRoots.find((r) => r.id === id);
    if (root) root.is_enabled = isEnabled;
    return;
  }
  await db.execute('UPDATE scan_roots SET is_enabled = ?, updated_at = ? WHERE id = ?', [
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
  if (!db) return { ...DEFAULT_SETTINGS };

  try {
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
  } catch (err) {
    console.error('fetchSettings DB error:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDb();
  const current = await fetchSettings();
  const updated = { ...current, ...settings };

  if (!db) return updated;

  for (const [key, val] of Object.entries(updated)) {
    await db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      key,
      JSON.stringify(val),
    ]);
  }

  return updated;
}
