import type { GetServerSideProps } from "next";
import {
  appServices,
  definePageConfig,
  type AppPage,
  type DashboardOverview,
} from "../app";
import { DashboardScreen } from "../features/dashboard";

interface DashboardProps {
  readonly overview: DashboardOverview;
}

const Dashboard: AppPage<DashboardProps> = function Dashboard({ overview }) {
  return <DashboardScreen overview={overview} />;
};

Dashboard.pageConfig = definePageConfig({ moduleId: "dashboard" });

export const getServerSideProps: GetServerSideProps<DashboardProps> = async () => ({
  props: { overview: await appServices.dashboard.getOverview() },
});

export default Dashboard;
