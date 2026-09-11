import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

const SIBLING_GAP = 140; // horizontal spacing between siblings
const GEN_GAP = 110; // vertical spacing between generations
const DEFAULT_EXPAND_DEPTH = 2;

function buildHierarchy(people) {
  if (!people?.length) return null;
  const byId = new Map(people.map((p) => [p.id, { ...p, children: [] }]));
  let root = null;
  for (const p of byId.values()) {
    if (p.parentId && byId.has(p.parentId)) {
      byId.get(p.parentId).children.push(p);
    } else if (!p.parentId) {
      root = p;
    }
  }
  if (!root) return null;
  const sortRec = (n) => {
    n.children.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    n.children.forEach(sortRec);
  };
  sortRec(root);
  return root;
}

// The unbranched lineage starting at the root (Adam -> ... -> الشايف -> ...) is
// rendered as a thick trunk, just like the source poster draws it as tree bark.
function computeTrunkIds(root) {
  const ids = new Set([root.id]);
  let cur = root;
  while (cur.children && cur.children.length === 1) {
    cur = cur.children[0];
    ids.add(cur.id);
  }
  return ids;
}

export default function TreeView({ people, selectedId, onSelect, focusId }) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const containerRef = useRef(null);

  const rawRoot = useMemo(() => buildHierarchy(people), [people]);
  const trunkIds = useMemo(() => (rawRoot ? computeTrunkIds(rawRoot) : new Set()), [rawRoot]);

  // initialize default-collapsed set once data first loads
  useEffect(() => {
    if (!rawRoot) return;
    setCollapsed((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set();
      const walk = (n, depth) => {
        if (depth >= DEFAULT_EXPAND_DEPTH && n.children?.length) next.add(n.id);
        (n.children || []).forEach((c) => walk(c, depth + 1));
      };
      walk(rawRoot, 0);
      return next;
    });
  }, [rawRoot]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes, links, idToNode } = useMemo(() => {
    if (!rawRoot) return { nodes: [], links: [], idToNode: new Map() };
    const prune = (n) => {
      const copy = { ...n };
      if (collapsed.has(n.id) || !n.children?.length) {
        copy.children = null;
        copy._childCount = n.children?.length || 0;
      } else {
        copy.children = n.children.map(prune);
        copy._childCount = n.children.length;
      }
      return copy;
    };
    const pruned = prune(rawRoot);
    const h = d3.hierarchy(pruned, (d) => d.children);
    const layout = d3.tree().nodeSize([SIBLING_GAP, GEN_GAP]);
    layout(h);
    const nodes = h.descendants();
    const links = h.links();
    const idToNode = new Map(nodes.map((n) => [n.data.id, n]));
    return { nodes, links, idToNode };
  }, [rawRoot, collapsed]);

  // root at the bottom (y = 0), generations grow upward (negative y) — like a real tree
  const posX = (n) => n.x;
  const posY = (n) => -n.y;

  const linkGen = useMemo(
    () =>
      d3
        .linkVertical()
        .x((d) => d.x)
        .y((d) => -d.y),
    []
  );

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3
      .zoom()
      .scaleExtent([0.12, 2.5])
      .on("zoom", (event) => {
        d3.select(gRef.current).attr("transform", event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;
    // center initial view on the trunk root, anchored near the bottom of the viewport
    svg.call(zoom.transform, d3.zoomIdentity.translate(dims.w / 2, dims.h - 90).scale(0.7));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgRef.current, rawRoot]);

  const focusOn = useCallback(
    (id) => {
      const node = idToNode.get(id);
      if (!node || !svgRef.current || !zoomRef.current) return;
      const svg = d3.select(svgRef.current);
      const scale = 1;
      const x = posX(node);
      const y = posY(node);
      svg
        .transition()
        .duration(600)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(dims.w / 2 - x * scale, dims.h * 0.65 - y * scale).scale(scale)
        );
    },
    [idToNode, dims]
  );

  // expand ancestors + focus when focusId changes (e.g. from search)
  useEffect(() => {
    if (!focusId || !rawRoot) return;
    const parentOf = new Map();
    const walk = (n) => {
      (n.children || []).forEach((c) => {
        parentOf.set(c.id, n.id);
        walk(c);
      });
    };
    walk(rawRoot);
    let cur = parentOf.get(focusId);
    const toExpand = [];
    while (cur) {
      toExpand.push(cur);
      cur = parentOf.get(cur);
    }
    if (toExpand.length) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        toExpand.forEach((id) => next.delete(id));
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, rawRoot]);

  // once the (now-expanded) target node actually exists in the layout, pan to it
  useEffect(() => {
    if (!focusId) return;
    if (!idToNode.has(focusId)) return;
    const t = setTimeout(() => focusOn(focusId), 50);
    return () => clearTimeout(t);
  }, [focusId, idToNode, focusOn]);

  const toggle = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    if (!rawRoot) return;
    const next = new Set();
    const walk = (n, depth) => {
      if (depth >= DEFAULT_EXPAND_DEPTH && n.children?.length) next.add(n.id);
      (n.children || []).forEach((c) => walk(c, depth + 1));
    };
    walk(rawRoot, 0);
    setCollapsed(next);
  };

  if (!rawRoot) {
    return <div className="tree-empty">لا توجد بيانات بعد. أضف أول فرد لبدء الشجرة.</div>;
  }

  return (
    <div className="tree-container" ref={containerRef}>
      <div className="tree-toolbar">
        <button className="btn btn-small" onClick={expandAll}>
          توسيع الكل
        </button>
        <button className="btn btn-small" onClick={collapseAll}>
          طي الكل
        </button>
      </div>
      <svg ref={svgRef} width="100%" height="100%" className="tree-svg">
        <g ref={gRef}>
          {links.map((l, i) => {
            const isTrunk = trunkIds.has(l.source.data.id) && trunkIds.has(l.target.data.id);
            return <path key={i} className={`tree-link ${isTrunk ? "trunk" : ""}`} d={linkGen(l)} />;
          })}
          {nodes.map((n) => {
            const x = posX(n);
            const y = posY(n);
            const isSelected = n.data.id === selectedId;
            const isTrunk = trunkIds.has(n.data.id);
            const hasHiddenChildren = n.data._childCount > 0 && !n.children;
            const hasVisibleChildren = !hasHiddenChildren && n.data.children?.length > 0 && n.depth > 0;
            return (
              <g
                key={n.data.id}
                transform={`translate(${x},${y})`}
                className={`tree-node ${isSelected ? "selected" : ""} ${n.depth === 0 ? "root" : ""} ${
                  isTrunk ? "trunk" : ""
                }`}
                onClick={() => onSelect(n.data.id)}
              >
                <ellipse className="tree-node-box" rx={64} ry={17} />
                <text className="tree-node-text" textAnchor="middle" dy="0.32em">
                  {n.data.name}
                </text>
                {(hasHiddenChildren || hasVisibleChildren) && (
                  <g
                    className="tree-expand-btn"
                    transform="translate(0,26)"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(n.data.id);
                    }}
                  >
                    <circle r={9} />
                    <text textAnchor="middle" dy="0.32em">
                      {hasHiddenChildren ? "+" : "−"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="tree-hint">التمرير للتكبير/التصغير، السحب للتنقل، اضغط + / − لطي وفتح الفروع</div>
    </div>
  );
}
