import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Show loading while checking auth status
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Head>
        <title>Xeno Dashboard</title>
        <meta name="description" content="Xeno Dashboard - Shopify Analytics" />
      </Head>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
