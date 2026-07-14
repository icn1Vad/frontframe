import type { GetServerSideProps } from "next";

export default function LoginRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/?auth=login#experience",
    permanent: false,
  },
});
