import { SessionProvider } from "next-auth/react";
import { TenantProvider } from "../contexts/TenantContext";
import "@/styles/globals.css";

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <TenantProvider>
        <Component {...pageProps} />
      </TenantProvider>
    </SessionProvider>
  );
}
