import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAdmin } from "./AdminContext";

export function useAuthGuard() {
  const { adminToken, authLoading } = useAdmin();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!adminToken) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [adminToken, authLoading, router]);

  return { ready };
}
