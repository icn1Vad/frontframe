import { definePageConfig, getRuntimeAppServices, type AppPage } from "../app";
import { ContractReviewUploadScreen } from "../features/contracts";

const ContractReview: AppPage = function ContractReview() {
  return <ContractReviewUploadScreen api={getRuntimeAppServices().contractReview} />;
};

ContractReview.pageConfig = definePageConfig({ moduleId: "contractReview" });

export default ContractReview;
