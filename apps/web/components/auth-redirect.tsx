"use client";

import { homePath } from "@filialhub/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

/** Агар корбар аллакай ворид шуда бошад — аз саҳифаи асосӣ ба саҳифаи кории ӯ мебарад. */
export function AuthRedirect() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace(homePath(user));
  }, [user, router]);
  return null;
}
