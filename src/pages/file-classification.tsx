import { definePageConfig, type AppPage } from "../app";
import { FileClassificationScreen } from "../features/documents";

const FileClassification: AppPage = function FileClassification() {
  return <FileClassificationScreen />;
};

FileClassification.pageConfig = definePageConfig({
  moduleId: "fileClassification",
});

export default FileClassification;
