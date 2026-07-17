import { useRouter } from "next/router";
import { appServices, definePageConfig, type AppPage } from "../../../../app";
import { ContractReviewWorkbenchScreen } from "../../../../features/contracts";

const ContractReviewWorkbench: AppPage = function ContractReviewWorkbench() {
  const router = useRouter();
  const rawTaskId = router.query.taskId;
  const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;

  if (!taskId) return null;
  return <ContractReviewWorkbenchScreen taskId={taskId} api={appServices.contractReview} />;
};

ContractReviewWorkbench.pageConfig = definePageConfig({
  moduleId: "contractReviewWorkbench",
  activeModuleId: "contractReviewTasks",
});

export default ContractReviewWorkbench;
