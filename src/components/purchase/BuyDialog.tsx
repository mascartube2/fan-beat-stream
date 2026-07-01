import { useState } from "react";
import { Loader2, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { Link } from "@tanstack/react-router";

type Method = "mvola" | "airtel" | "orange";

const METHOD_LABELS: Record<Method, string> = {
  mvola: "Mvola",
  airtel: "Airtel Money",
  orange: "Orange Money",
};

export function BuyDialog({
  itemType,
  itemId,
  priceAr,
  title,
  onClose,
  onSuccess,
}: {
  itemType: "track" | "album";
  itemId: string;
  priceAr: number;
  title: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const [method, setMethod] = useState<Method>("mvola");
  const [payerNumber, setPayerNumber] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const artistShare = Math.floor((priceAr * 85) / 100);
  const platformShare = priceAr - artistShare;

  const submit = async () => {
    if (!user) return;
    if (!payerNumber.trim()) return toast.error("Entre ton numéro de paiement");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("request_purchase", {
        _item_type: itemType,
        _item_id: itemId,
        _payment_method: method,
        _payer_number: payerNumber.trim(),
        _payment_reference: reference.trim() || null,
      });
      if (error) throw error;
      const res = data as { success?: boolean } | null;
      if (!res?.success) throw new Error("Achat impossible");
      toast.success("Demande envoyée ! Un admin validera après réception du paiement.");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-border/50 bg-surface p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Acheter · {title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/5" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 rounded-xl border border-border/40 bg-gradient-card p-3 text-xs">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Prix</span>
            <span className="text-lg font-bold">{priceAr.toLocaleString()} Ar</span>
          </div>
          <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            <p>🎤 Artiste (85 %) : <span className="font-semibold text-foreground">{artistShare.toLocaleString()} Ar</span></p>
            <p>💠 Plateforme (15 %) : <span className="font-semibold text-foreground">{platformShare.toLocaleString()} Ar</span></p>
          </div>
        </div>

        {!user ? (
          <div className="rounded-xl border border-border/40 p-4 text-center text-xs">
            <p className="mb-2 text-muted-foreground">Connecte-toi pour acheter.</p>
            <Link to="/auth" className="inline-block rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold">
              Se connecter
            </Link>
          </div>
        ) : (
          <>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Moyen de paiement</label>
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {(Object.keys(METHOD_LABELS) as Method[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-full px-2 py-1.5 text-[11px] font-semibold transition ${
                    method === m ? "bg-gradient-primary text-primary-foreground shadow-glow" : "border border-border/50 text-muted-foreground"
                  }`}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>

            <div className="mb-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-[11px]">
              <p className="font-semibold">Instructions</p>
              <p className="mt-1 text-muted-foreground">
                Envoie <span className="font-bold text-foreground">{priceAr.toLocaleString()} Ar</span> via {METHOD_LABELS[method]} au numéro
                affiché sur la page <Link to="/pricing" className="text-primary-glow underline">tarifs</Link>, puis renseigne ta
                référence ci-dessous. Ton achat sera validé après confirmation.
              </p>
            </div>

            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Ton numéro payeur</label>
            <input
              value={payerNumber}
              onChange={(e) => setPayerNumber(e.target.value)}
              placeholder="034 xx xxx xx"
              className="mb-3 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />

            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Référence de transaction (optionnel)</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="ID / code du reçu"
              className="mb-4 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />

            <button
              onClick={submit}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-bold shadow-glow disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              Confirmer l'achat
            </button>
          </>
        )}
      </div>
    </div>
  );
}
