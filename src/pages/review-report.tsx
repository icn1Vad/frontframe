import type { GetServerSideProps } from "next";
import { routes } from "../app/routes";

export default function LegacyReviewReport() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: routes.reviewReport("review_purchase_policy_v1"),
    permanent: false,
  },
});
