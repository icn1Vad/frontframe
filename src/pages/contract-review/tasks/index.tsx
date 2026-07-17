import {
  appServices,
  contractReviewAuth,
  definePageConfig,
  type AppPage,
} from "../../../app";
import {
  ContractReviewTasksScreen,
  ContractWorkspaceGate,
} from "../../../features/contracts";

const ContractReviewTasks: AppPage = function ContractReviewTasks() {
  return (
    <ContractWorkspaceGate auth={contractReviewAuth}>
      <ContractReviewTasksScreen api={appServices.contractReview} />
    </ContractWorkspaceGate>
  );
};

ContractReviewTasks.pageConfig = definePageConfig({ moduleId: "contractReviewTasks" });

export default ContractReviewTasks;
