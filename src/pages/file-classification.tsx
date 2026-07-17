import {
  definePageConfig,
  getRuntimeAppServices,
  isJavaSliceEnabled,
  type AppPage,
} from "../app";
import { FileClassificationScreen } from "../features/documents";

const FileClassification: AppPage = function FileClassification() {
  return (
    <FileClassificationScreen
      api={getRuntimeAppServices().classification}
      useDemoInitialFiles={!isJavaSliceEnabled()}
    />
  );
};

FileClassification.pageConfig = definePageConfig({
  moduleId: "fileClassification",
});

export default FileClassification;
