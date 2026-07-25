import React, { useMemo } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
  ArrowLeft,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  Globe,
  HardDrive,
  Pencil,
  Play,
  RefreshCcw,
  Star,
  Terminal,
  Users,
} from 'lucide-react';
import { Badge, Button, Callout, IconButton } from '@git-manager/ui';
import { getFallbackInitials } from '@git-manager/shared';
import type { Project } from '@git-manager/shared';
import { useAppStore } from '../store/useAppStore.js';
import * as tauri from '../services/tauri.js';
import { ActivityChart, LanguageBar, Punchcard, ShareBar } from './detail/Charts.js';
import { HealthPanel, HotspotTable, Section, StackPanel, StatTile } from './detail/Panels.js';
import { ProjectMap } from './detail/ProjectMap.js';
import {
  SERIES,
  buildLanguageColors,
  formatBytes,
  formatCount,
  formatDate,
  formatDuration,
  formatRelativeDays,
} from './detail/viz.js';

export const ProjectDetailView: React.FC = () => {
  const {
    projects,
    groups,
    openProjectId,
    analysis,
    isAnalyzing,
    analysisError,
    closeProjectDetail,
    refreshAnalysis,
    launchEditor,
    launchTerminal,
    launchDevServer,
    launchFolder,
    launchWebsite,
    toggleFavorite,
    setEditingProject,
    showToast,
  } = useAppStore();

  const project = projects.find((p) => p.id === openProjectId);
  const group = project?.group_id ? groups.find((g) => g.id === project.group_id) : undefined;

  // Language -> colour, assigned once per analysis so the map, the bar and the
  // legend all agree.
  const languageColors = useMemo(
    () => buildLanguageColors((analysis?.languages ?? []).map((l) => l.language)),
    [analysis]
  );

  if (!project) return null;

  const git = analysis?.git ?? null;

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(project.path);
      showToast('Path copied to clipboard', 'success');
    } catch {
      showToast('Could not access the clipboard', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-6 py-4">
        <div className="flex items-start gap-4">
          <IconButton
            icon={<ArrowLeft className="w-4 h-4" />}
            title="Back to projects"
            variant="secondary"
            onClick={closeProjectDetail}
          />

          <ProjectAvatar project={project} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-slate-50 tracking-tight truncate">
                {project.name}
              </h1>
              {project.is_favorite && (
                <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
              )}
              {group && <Badge color={group.color}>{group.name}</Badge>}
              {project.tags?.map((tag) => (
                <Badge key={tag.id} color={tag.color}>
                  {tag.name}
                </Badge>
              ))}
              {git?.branch && (
                <Badge variant="outline">
                  <GitBranch className="w-3 h-3" /> {git.branch}
                </Badge>
              )}
              {git?.is_dirty && (
                <Badge variant="warning">{git.dirty_files} uncommitted</Badge>
              )}
            </div>

            <button
              onClick={copyPath}
              title="Copy full path"
              className="mt-1 group/path inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors max-w-full"
            >
              <span className="truncate">{project.path}</span>
              <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover/path:opacity-100 transition-opacity" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <IconButton
              icon={<Play className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />}
              title="Launch dev server"
              variant="secondary"
              disabled={project.is_missing}
              onClick={() => launchDevServer(project)}
            />
            <IconButton
              icon={<Code2 className="w-4 h-4 text-indigo-400" />}
              title="Open in editor"
              variant="secondary"
              disabled={project.is_missing}
              onClick={() => launchEditor(project)}
            />
            <IconButton
              icon={<Terminal className="w-4 h-4 text-sky-400" />}
              title="Open terminal"
              variant="secondary"
              disabled={project.is_missing}
              onClick={() => launchTerminal(project)}
            />
            <IconButton
              icon={<FolderGit2 className="w-4 h-4 text-amber-400" />}
              title="Open project folder"
              variant="secondary"
              disabled={project.is_missing}
              onClick={() => launchFolder(project)}
            />
            <IconButton
              icon={
                <Globe
                  className={`w-4 h-4 ${project.website_url ? 'text-blue-400' : 'text-slate-600'}`}
                />
              }
              title={project.website_url ? `Open ${project.website_url}` : 'No website configured'}
              variant="secondary"
              disabled={!project.website_url}
              onClick={() => launchWebsite(project)}
            />
            {project.repository_url && (
              <IconButton
                icon={<ExternalLink className="w-4 h-4 text-slate-400" />}
                title="Open repository page"
                variant="secondary"
                onClick={() => tauri.invokeOpenBrowserUrl(project.repository_url!)}
              />
            )}
            <IconButton
              icon={<Pencil className="w-4 h-4 text-slate-400" />}
              title="Edit project details"
              variant="secondary"
              onClick={() => setEditingProject(project)}
            />
            <IconButton
              icon={
                <Star
                  className={`w-4 h-4 ${
                    project.is_favorite ? 'fill-amber-500 text-amber-500' : 'text-slate-500'
                  }`}
                />
              }
              title={project.is_favorite ? 'Remove favorite' : 'Add to favorites'}
              variant="secondary"
              onClick={() => toggleFavorite(project)}
            />
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-6 space-y-5 max-w-[1600px]">
        {project.is_missing && (
          <Callout variant="danger" title="Folder is missing on disk">
            This project's directory no longer exists, so nothing can be analyzed. Relink it from
            the project card to restore the connection.
          </Callout>
        )}

        {analysisError && (
          <Callout variant="danger" title="Analysis failed">
            {analysisError}
          </Callout>
        )}

        {isAnalyzing && <AnalysisSkeleton />}

        {analysis && !isAnalyzing && (
          <>
            {analysis.notes.length > 0 && (
              <Callout variant="info" title="About these numbers">
                <ul className="list-disc pl-4 space-y-0.5 text-xs">
                  {analysis.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </Callout>
            )}

            {/* Headline metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <StatTile
                label="Commits"
                icon={<GitCommitHorizontal className="w-3 h-3" />}
                value={git ? formatCount(git.total_commits) : '—'}
                hint={git ? `${git.active_days} active days` : 'No git history'}
              />
              <StatTile
                label="Contributors"
                icon={<Users className="w-3 h-3" />}
                value={git ? String(git.authors.length) : '—'}
                hint={git ? `Bus factor ${git.bus_factor}` : undefined}
              />
              <StatTile
                label="Age"
                value={git ? formatDuration(git.age_days) : '—'}
                hint={git ? `First commit ${formatDate(git.first_commit_at)}` : undefined}
              />
              <StatTile
                label="Last commit"
                value={git ? formatRelativeDays(git.days_since_last_commit) : '—'}
                hint={
                  git
                    ? `${git.commits_last_30d} in the last 30 days`
                    : undefined
                }
              />
              <StatTile
                label="Code"
                icon={<FileCode2 className="w-3 h-3" />}
                value={formatCount(analysis.summary.code_lines)}
                hint={`${formatCount(analysis.summary.total_files)} files · ${formatCount(
                  analysis.summary.total_lines
                )} lines total`}
              />
              <StatTile
                label="On disk"
                icon={<HardDrive className="w-3 h-3" />}
                value={formatBytes(analysis.summary.total_bytes)}
                hint={`${analysis.summary.total_dirs} folders, ${analysis.summary.max_depth} deep`}
              />
            </div>

            {/* Map + composition */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-5">
              <Section
                title="Project map"
                subtitle="Every tile is a directory, sized by code volume and coloured by its dominant language"
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<RefreshCcw className="w-3.5 h-3.5" />}
                    onClick={refreshAnalysis}
                  >
                    Re-scan
                  </Button>
                }
              >
                <ProjectMap root={analysis.map} colors={languageColors} />
              </Section>

              <Section title="Composition" subtitle="Share of measured lines by language">
                <LanguageBar languages={analysis.languages} colors={languageColors} />
              </Section>
            </div>

            {/* Activity */}
            {git && (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-5">
                <Section
                  title="Commit activity"
                  subtitle={`${git.commits_last_90d} commits in the last 90 days · momentum ${git.momentum.toFixed(
                    2
                  )}x lifetime average`}
                >
                  <ActivityChart weeks={git.weekly_activity} />
                </Section>

                <Section title="When work happens" subtitle="Commits by weekday and hour">
                  <Punchcard grid={git.punchcard} />
                </Section>
              </div>
            )}

            {/* Health + contributors */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-5">
              <Section
                title="Repository health"
                subtitle="Twelve weighted checks — hover any row for the reasoning"
              >
                <HealthPanel health={analysis.health} />
              </Section>

              <Section
                title="Contributors"
                subtitle={
                  git
                    ? `${git.authors.length} ${
                        git.authors.length === 1 ? 'person' : 'people'
                      }, by commit share`
                    : undefined
                }
              >
                {git && git.authors.length > 0 ? (
                  <div className="space-y-3">
                    {git.authors.slice(0, 8).map((author, index) => (
                      <ShareBar
                        key={author.email}
                        label={author.name}
                        sublabel={`+${formatCount(author.insertions)} / −${formatCount(
                          author.deletions
                        )} · last ${formatDate(author.last_commit_at)}`}
                        value={`${author.commits} (${Math.round(author.share * 100)}%)`}
                        share={author.share}
                        accent={index === 0 ? SERIES[0] : '#334155'}
                      />
                    ))}
                    {git.authors.length > 8 && (
                      <p className="text-[10px] text-slate-500 pt-1">
                        +{git.authors.length - 8} more contributors
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No git history available.</p>
                )}
              </Section>
            </div>

            {/* Hotspots + stack */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-5">
              <Section
                title="Hotspots"
                subtitle="Files that are both large and frequently changed — where risk concentrates"
              >
                <HotspotTable hotspots={analysis.hotspots} />
              </Section>

              <Section title="Detected stack" subtitle="From manifests and marker files">
                <StackPanel stack={analysis.stack} />
              </Section>
            </div>

            {/* Recent commits + largest files */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Section title="Recent commits">
                {git && git.recent_commits.length > 0 ? (
                  <ul className="space-y-2.5">
                    {git.recent_commits.map((commit) => (
                      <li key={commit.hash} className="flex items-start gap-3 text-[11px]">
                        <code className="font-mono text-slate-500 shrink-0 pt-px">
                          {commit.hash}
                        </code>
                        <div className="min-w-0 flex-1">
                          <div className="text-slate-200 truncate" title={commit.subject}>
                            {commit.subject}
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {commit.author} · {formatDate(commit.date)}
                          </div>
                        </div>
                        <div className="shrink-0 tabular-nums font-mono text-[10px]">
                          <span className="text-emerald-400">+{commit.insertions}</span>{' '}
                          <span className="text-rose-400">−{commit.deletions}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No commits to show.</p>
                )}
              </Section>

              <Section title="Largest files" subtitle="Refactoring candidates by line count">
                {analysis.largest_files.length > 0 ? (
                  <ul className="space-y-1.5">
                    {analysis.largest_files.map((file) => (
                      <li key={file.path} className="flex items-center gap-3 text-[11px]">
                        <span
                          className="font-mono text-slate-300 truncate flex-1"
                          title={file.path}
                        >
                          {file.path}
                        </span>
                        <span className="text-slate-500 shrink-0">{file.language}</span>
                        <span className="text-slate-200 tabular-nums shrink-0 w-14 text-right font-semibold">
                          {formatCount(file.lines)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No measurable files found.</p>
                )}
              </Section>
            </div>

            <p className="text-[10px] text-slate-600 text-center pb-2">
              Analyzed in {analysis.duration_ms} ms · {formatDate(analysis.generated_at)}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const ProjectAvatar: React.FC<{ project: Project }> = ({ project }) => {
  const initials = getFallbackInitials(project.name);
  const src = project.icon_cache_path
    ? project.icon_cache_path.startsWith('http')
      ? project.icon_cache_path
      : convertFileSrc(project.icon_cache_path)
    : null;

  if (!src) {
    return (
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 text-sm shrink-0">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="w-11 h-11 rounded-xl object-contain bg-slate-800 p-1 border border-slate-700 shrink-0"
    />
  );
};

const AnalysisSkeleton: React.FC = () => (
  <div className="space-y-5 animate-pulse" aria-label="Analyzing repository">
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[86px] rounded-xl border border-slate-800/80 bg-slate-900/60" />
      ))}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-5">
      <div className="h-[420px] rounded-2xl border border-slate-800/80 bg-slate-900/60" />
      <div className="h-[420px] rounded-2xl border border-slate-800/80 bg-slate-900/60" />
    </div>
  </div>
);
