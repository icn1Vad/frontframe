import { appServices, definePageConfig, type AppPage } from "../app";
import { FileClassificationScreen } from "../features/documents";

const FileClassification: AppPage = function FileClassification() {
  return <FileClassificationScreen api={appServices.classification} />;
};

FileClassification.pageConfig = definePageConfig({
  moduleId: "fileClassification",
});

export default FileClassification;
