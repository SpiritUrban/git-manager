import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, FolderGit2 } from 'lucide-react';
import type { Project, Group } from '@git-manager/shared';
import { useAppStore } from '../store/useAppStore.js';
import { ProjectCard } from './ProjectCard.js';

interface SortableCardWrapperProps {
  project: Project;
  group?: Group;
  isDragEnabled: boolean;
}

const SortableCardWrapper: React.FC<SortableCardWrapperProps> = ({ project, group, isDragEnabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    disabled: !isDragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectCard project={project} group={group} dragHandleProps={isDragEnabled ? { ...attributes, ...listeners } : undefined} />
    </div>
  );
};

export const ProjectGrid: React.FC = () => {
  const {
    projects,
    groups,
    activeView,
    selectedGroupId,
    selectedTagId,
    searchQuery,
    sortOption,
    reorderProjects,
    toggleGroupCollapsed,
  } = useAppStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Filter projects based on active view & search query
  const filteredProjects = React.useMemo(() => {
    let list = [...projects];

    // Filter by view
    if (activeView === 'favorites') {
      list = list.filter((p) => p.is_favorite && !p.is_archived);
    } else if (activeView === 'recent') {
      list = list.filter((p) => p.last_opened_at && !p.is_archived);
    } else if (activeView === 'unassigned') {
      list = list.filter((p) => !p.group_id && !p.is_archived);
    } else if (activeView === 'missing') {
      list = list.filter((p) => p.is_missing && !p.is_archived);
    } else if (activeView === 'archived') {
      list = list.filter((p) => p.is_archived);
    } else if (activeView === 'group' && selectedGroupId) {
      list = list.filter((p) => p.group_id === selectedGroupId && !p.is_archived);
    } else if (activeView === 'tag' && selectedTagId) {
      list = list.filter((p) => p.tags?.some((t) => t.id === selectedTagId) && !p.is_archived);
    } else {
      // 'all'
      list = list.filter((p) => !p.is_archived);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.path.toLowerCase().includes(q) ||
          (p.website_url && p.website_url.toLowerCase().includes(q)) ||
          (p.repository_url && p.repository_url.toLowerCase().includes(q)) ||
          p.tags?.some((t) => t.name.toLowerCase().includes(q))
      );
    }

    // Apply Sorting
    if (sortOption === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'recently-opened') {
      list.sort((a, b) => {
        const da = a.last_opened_at ? new Date(a.last_opened_at).getTime() : 0;
        const db = b.last_opened_at ? new Date(b.last_opened_at).getTime() : 0;
        return db - da;
      });
    } else if (sortOption === 'recently-added') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // Manual sorting by manual_position
      list.sort((a, b) => a.manual_position - b.manual_position);
    }

    return list;
  }, [projects, activeView, selectedGroupId, selectedTagId, searchQuery, sortOption]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filteredProjects.findIndex((p) => p.id === active.id);
      const newIndex = filteredProjects.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(filteredProjects, oldIndex, newIndex);
      reorderProjects(reordered);
    }
  };

  const isDragEnabled = sortOption === 'manual';
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  if (filteredProjects.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-500 mb-4">
          <FolderGit2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-200 mb-1">No repositories found</h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          {searchQuery
            ? `No projects matched "${searchQuery}". Try clearing search filter.`
            : 'No projects exist in this view category yet.'}
        </p>
      </div>
    );
  }

  // Render grouped view if in 'all' view with manual sort option
  if (activeView === 'all' && groups.length > 0 && !searchQuery) {
    const unassignedList = filteredProjects.filter((p) => !p.group_id);

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {!isDragEnabled && (
          <div className="text-[11px] text-slate-400 bg-slate-800/50 border border-slate-800 rounded-lg px-3 py-1.5 inline-block">
            💡 Drag-and-drop manual ordering is available when sort mode is set to <strong>Manual Order</strong>.
          </div>
        )}

        {groups.map((group) => {
          const groupProjects = filteredProjects.filter((p) => p.group_id === group.id);
          if (groupProjects.length === 0) return null;

          return (
            <div key={group.id} className="space-y-3">
              <button
                onClick={() => toggleGroupCollapsed(group.id)}
                className="flex items-center gap-2 text-sm font-bold text-slate-200 hover:text-white select-none group"
              >
                {group.is_collapsed ? (
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" />
                )}
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                <span>{group.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {groupProjects.length}
                </span>
              </button>

              {!group.is_collapsed && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={groupProjects.map((p) => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {groupProjects.map((project) => (
                        <SortableCardWrapper
                          key={project.id}
                          project={project}
                          group={group}
                          isDragEnabled={isDragEnabled}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          );
        })}

        {unassignedList.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-400 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>Unassigned</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {unassignedList.length}
              </span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={unassignedList.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unassignedList.map((project) => (
                    <SortableCardWrapper
                      key={project.id}
                      project={project}
                      isDragEnabled={isDragEnabled}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    );
  }

  // Standard flat grid view
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {!isDragEnabled && (
        <div className="text-[11px] text-slate-400 bg-slate-800/50 border border-slate-800 rounded-lg px-3 py-1.5 inline-block">
          💡 Drag-and-drop manual ordering is available when sort mode is set to <strong>Manual Order</strong>.
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredProjects.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <SortableCardWrapper
                key={project.id}
                project={project}
                group={project.group_id ? groupMap.get(project.group_id) : undefined}
                isDragEnabled={isDragEnabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
