import {
  appServices,
  contractReviewAuth,
  definePageConfig,
  type AppPage,
} from "../app";
import {
  ContractReviewUploadScreen,
  ContractWorkspaceGate,
} from "../features/contracts";

const ContractReview: AppPage = function ContractReview() {
  return (
    <ContractWorkspaceGate auth={contractReviewAuth}>
      <ContractReviewUploadScreen api={appServices.contractReview} />
    </ContractWorkspaceGate>
  );
};

ContractReview.pageConfig = definePageConfig({ moduleId: "contractReview" });

export default ContractReview;
