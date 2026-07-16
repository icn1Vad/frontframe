interface StaticNetworkVisualProps {
  readonly variant: "governance" | "agent";
}

const governanceLabels = ["制度审核", "文件分类", "智能问答", "文件审核", "知识库管理"];
const agentLabels = ["任务管理", "调度中心", "注册中心", "工具网关", "会话与追踪", "数据访问"];

export function StaticNetworkVisual({ variant }: StaticNetworkVisualProps) {
  const isAgent = variant === "agent";
  const labels = isAgent ? agentLabels : governanceLabels;

  return (
    <div
      aria-label={isAgent ? "智能体控制网络示意图" : "企业文件治理网络示意图"}
      className="landing-static-network"
      role="img"
    >
      <div className="landing-static-network-ring" />
      <strong>{isAgent ? "智能执行内核" : "文件治理"}</strong>
      <div className="landing-static-network-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
