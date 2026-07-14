import type { GetServerSideProps } from "next";

export default function RegisterRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/?auth=register#experience",
    permanent: false,
  },
});
