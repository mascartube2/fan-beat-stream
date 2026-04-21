import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";

export function useMaca() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [isCertified, setIsCertified] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setBalance(0);
      setIsCertified(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("mascar_coins,is_certified")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance(data?.mascar_coins ?? 0);
    setIsCertified(!!data?.is_certified);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { mascar_coins?: number; is_certified?: boolean };
          if (typeof row.mascar_coins === "number") setBalance(row.mascar_coins);
          if (typeof row.is_certified === "boolean") setIsCertified(row.is_certified);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { balance, isCertified, loading, refresh };
}

export const MACA_TO_AR = 10;
export const formatMaca = (n: number) => `${n.toLocaleString("fr-FR")} MA.CA`;
export const formatAr = (n: number) => `${n.toLocaleString("fr-FR")} Ar`;
