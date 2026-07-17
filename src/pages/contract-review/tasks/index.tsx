import { definePageConfig, getRuntimeAppServices, type AppPage } from "../../../app";
import { ContractReviewTasksScreen } from "../../../features/contracts";

const ContractReviewTasks: AppPage = function ContractReviewTasks() {
  return <ContractReviewTasksScreen api={getRuntimeAppServices().contractReview} />;
};

ContractReviewTasks.pageConfig = definePageConfig({ moduleId: "contractReviewTasks" });

export default ContractReviewTasks;
