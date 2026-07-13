import { definePageConfig, type AppPage } from "../app";
import { DashboardScreen } from "../features/dashboard";

const Dashboard: AppPage = function Dashboard() {
  return <DashboardScreen />;
};

Dashboard.pageConfig = definePageConfig({ moduleId: "dashboard" });
export default Dashboard;
