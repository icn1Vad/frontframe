import { appServices, definePageConfig, type AppPage } from "../../../app";
import { ContractReviewTasksScreen } from "../../../features/contracts";

const ContractReviewTasks: AppPage = function ContractReviewTasks() {
  return <ContractReviewTasksScreen api={appServices.contractReview} />;
};

ContractReviewTasks.pageConfig = definePageConfig({ moduleId: "contractReviewTasks" });

export default ContractReviewTasks;
