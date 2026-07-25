import React, { useMemo, useRef, useState } from 'react';
import type { MapNode } from '@git-manager/shared';
import { colorFor, formatBytes, formatCount, squarify, type Rect, type Tile } from './viz.js';

interface ProjectMapProps {
  root: MapNode;
  colors: Map<string, string>;
}

const VIEW_W = 1000;
const VIEW_H = 560;
/** 2px surface gap between fills, per the chart mark spec. */
const GAP = 2;
const HEADER_H = 20;
/** Below this a parent tile has no room for a header + children. */
const MIN_NEST_W = 92;
const MIN_NEST_H = 62;

interface PlacedNode {
  node: MapNode;
  rect: Rect;
  depth: number;
  /** Parent tiles are drawn as a recessive frame; leaves carry the language colour. */
  isLeaf: boolean;
}

function inset(rect: Rect, top: number): Rect {
  return {
    x: rect.x + GAP,
    y: rect.y + top,
    w: Math.max(0, rect.w - GAP * 2),
    h: Math.max(0, rect.h - top - GAP),
  };
}

/** Lays out the tree depth-first, nesting children inside a parent that has room. */
function place(nodes: MapNode[], rect: Rect, depth: number, out: PlacedNode[]): void {
  const tiles: Tile<MapNode>[] = squarify(nodes, (n) => n.weight, rect);

  for (const tile of tiles) {
    const node = tile.item;
    const box: Rect = { x: tile.x, y: tile.y, w: tile.w, h: tile.h };
    const canNest =
      depth < 2 &&
      node.children.length > 0 &&
      box.w >= MIN_NEST_W &&
      box.h >= MIN_NEST_H;

    out.push({ node, rect: box, depth, isLeaf: !canNest });

    if (canNest) {
      place(node.children, inset(box, HEADER_H), depth + 1, out);
    }
  }
}

export const ProjectMap: React.FC<ProjectMapProps> = ({ root, colors }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ node: MapNode; x: number; y: number } | null>(null);

  const placed = useMemo(() => {
    const out: PlacedNode[] = [];
    place(root.children, { x: 0, y: 0, w: VIEW_W, h: VIEW_H }, 0, out);
    return out;
  }, [root]);

  if (placed.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-500">
        Nothing to map — no measurable source files were found.
      </div>
    );
  }

  const handleMove = (event: React.MouseEvent, node: MapNode) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setHovered({
      node,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  return (
    <div ref={containerRef} className="relative" onMouseLeave={() => setHovered(null)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto rounded-xl overflow-hidden"
        role="img"
        aria-label="Treemap of the project's directories, sized by code volume and coloured by dominant language"
      >
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#020617" />

        {placed.map((entry) => {
          const { node, rect, depth, isLeaf } = entry;
          const isOverflow = node.kind === 'overflow';
          // Overflow tiles are a recessive grey block; everything else carries
          // its language colour, which the dark label text is legible against.
          const fill = isOverflow ? '#1e293b' : colorFor(colors, node.language);
          const labelInk = isOverflow ? '#94a3b8' : '#0b1220';
          const isHovered = hovered?.node.path === node.path;

          return (
            <g
              key={`${depth}-${node.path}`}
              onMouseMove={(e) => handleMove(e, node)}
              onMouseEnter={(e) => handleMove(e, node)}
            >
              <rect
                x={rect.x + GAP / 2}
                y={rect.y + GAP / 2}
                width={Math.max(0, rect.w - GAP)}
                height={Math.max(0, rect.h - GAP)}
                rx={depth === 0 ? 8 : 4}
                fill={isLeaf ? fill : '#0b1220'}
                fillOpacity={isLeaf && !isOverflow ? 0.85 : 1}
                stroke={isHovered ? '#e2e8f0' : isLeaf ? 'none' : 'rgba(148,163,184,0.22)'}
                strokeWidth={isHovered ? 2 : 1}
              />

              {/* Parent tiles label their header strip; leaves label themselves. */}
              {!isLeaf && rect.w > 60 && (
                <text
                  x={rect.x + 10}
                  y={rect.y + 15}
                  className="fill-slate-300"
                  fontSize={12}
                  fontWeight={700}
                >
                  {clip(node.name, rect.w - 20, 12)}
                </text>
              )}

              {isLeaf && rect.w > 54 && rect.h > 24 && (
                <>
                  <text
                    x={rect.x + 8}
                    y={rect.y + 17}
                    fontSize={11}
                    fontWeight={600}
                    fill={labelInk}
                    fillOpacity={0.85}
                  >
                    {clip(node.name, rect.w - 16, 11)}
                  </text>
                  {rect.h > 40 && (
                    <text
                      x={rect.x + 8}
                      y={rect.y + 31}
                      fontSize={10}
                      fill={labelInk}
                      fillOpacity={0.6}
                    >
                      {formatCount(node.lines)} lines
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-20 px-3 py-2 rounded-lg bg-slate-950/95 border border-slate-700 shadow-2xl text-[11px] leading-relaxed backdrop-blur-sm"
          style={{
            left: Math.min(hovered.x + 14, (containerRef.current?.clientWidth ?? 0) - 220),
            top: hovered.y + 14,
            maxWidth: 220,
          }}
        >
          <div className="font-mono font-bold text-slate-100 break-all">
            {hovered.node.path || hovered.node.name}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 text-slate-400 tabular-nums">
            <span>Files</span>
            <span className="text-slate-200 text-right">{formatCount(hovered.node.files)}</span>
            <span>Lines</span>
            <span className="text-slate-200 text-right">{formatCount(hovered.node.lines)}</span>
            <span>Size</span>
            <span className="text-slate-200 text-right">{formatBytes(hovered.node.bytes)}</span>
          </div>
          {hovered.node.language && (
            <div className="mt-1.5 flex items-center gap-1.5 text-slate-400">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: colorFor(colors, hovered.node.language) }}
              />
              {hovered.node.language}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Truncates a label to the pixels available, using an average glyph width. */
function clip(text: string, availablePx: number, fontSize: number): string {
  const perChar = fontSize * 0.58;
  const max = Math.floor(availablePx / perChar);
  if (max <= 1) return '';
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}
