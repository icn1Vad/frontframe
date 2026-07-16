import type { KnowledgeGraph } from "../application";

export interface KnowledgeGraphViewProps {
  readonly graph: KnowledgeGraph | null;
  readonly loading?: boolean;
  readonly error?: string | null;
}

export function KnowledgeGraphView({
  graph,
  loading = false,
  error = null,
}: KnowledgeGraphViewProps) {
  if (loading) {
    return <div className="knowledge-graph-state">正在生成知识关系图…</div>;
  }
  if (error) {
    return <div className="knowledge-graph-state error">{error}</div>;
  }
  if (!graph || graph.nodes.length === 0) {
    return <div className="knowledge-graph-state">暂无可展示的知识关系</div>;
  }

  const centerX = 400;
  const centerY = 220;
  const radius = Math.min(150, 58 + graph.nodes.length * 18);
  const positions = new Map(
    graph.nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / graph.nodes.length - Math.PI / 2;
      return [
        node.id,
        {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        },
      ] as const;
    }),
  );

  return (
    <section className="knowledge-graph-panel" aria-label="知识关系图">
      <header>
        <div>
          <h2>知识关系图</h2>
          <p>展示正式入库文件之间的关联关系。</p>
        </div>
        <span>{graph.nodes.length} 个知识节点</span>
      </header>
      <svg
        role="img"
        aria-label="正式入库知识文件关系"
        viewBox="0 0 800 440"
      >
        {graph.edges.map((edge) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);
          if (!source || !target) return null;
          return (
            <g key={`${edge.source}-${edge.target}`}>
              <line
                className="knowledge-graph-edge"
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
              />
              <text
                className="knowledge-graph-relation"
                x={(source.x + target.x) / 2}
                y={(source.y + target.y) / 2 - 5}
              >
                {edge.relation}
              </text>
            </g>
          );
        })}
        {graph.nodes.map((node) => {
          const position = positions.get(node.id)!;
          return (
            <g
              className="knowledge-graph-node"
              key={node.id}
              transform={`translate(${position.x} ${position.y})`}
            >
              <circle r="42" />
              <foreignObject x="-74" y="-24" width="148" height="48">
                <div className="knowledge-graph-label" title={node.label}>
                  {node.label}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
