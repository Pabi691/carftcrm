import "@/styles/globals.css";
import Head from "next/head";
import { AdminProvider } from "@/components/AdminContext";

export default function App({ Component, pageProps }) {
  return (
    <AdminProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <title>Craft &amp; Weft Admin</title>
      </Head>
      <Component {...pageProps} />
    </AdminProvider>
  );
}
