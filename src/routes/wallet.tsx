import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Coins, Wallet, ArrowDownToLine, ArrowUpFromLine, Loader2, Smartphone, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { useMaca, formatAr } from "@/hooks/use-maca";
import { toast } from "sonner";

const MVOLA_NUMBER = "0346812942";
const PACKS = [
  { ar: 500, maca: 50 },
  { ar: 1000, maca: 100 },
  { ar: 5000, maca: 500 },
  { ar: 10000, maca: 1000 },
];

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "Portefeuille — Mascartube" }] }),
});

type Deposit = {
  id: string;
  amount_ar: number;
  maca_amount: number;
  status: string;
  transaction_ref: string;
  created_at: string;
};

type Withdrawal = {
  id: string;
  maca_amount: number;
  amount_ar: number;
  mvola_number: string;
  status: string;
  created_at: string;
};

function WalletPage() {
  const { user, isArtist, loading: authLoading } = useAuth();
  const { balance, refresh } = useMaca();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [pack, setPack] = useState<(typeof PACKS)[number] | null>(null);
  const [ref, setRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Withdrawal form
  const [wAmount, setWAmount] = useState(500);
  const [wNumber, setWNumber] = useState("");
  const [wBusy, setWBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: d }, { data: w }] = await Promise.all([
      supabase.from("deposits").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setDeposits((d ?? []) as Deposit[]);
    setWithdrawals((w ?? []) as Withdrawal[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return (
    <div className="px-5 pt-12 text-center">
      <p className="mb-4 text-sm text-muted-foreground">Connecte-toi pour accéder au portefeuille.</p>
      <Link to="/auth" className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold">Se connecter</Link>
    </div>
  );

  const copyMvola = async () => {
    await navigator.clipboard.writeText(MVOLA_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Numéro copié");
  };

  const submitDeposit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pack) return toast.error("Choisis un pack");
    if (ref.trim().length < 4) return toast.error("Référence invalide");
    setSubmitting(true);
    const { error } = await supabase.from("deposits").insert({
      user_id: user.id,
      amount_ar: pack.ar,
      maca_amount: pack.maca,
      operator: "Mvola",
      transaction_ref: ref.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Dépôt enregistré — en attente de validation");
    setRef("");
    setPack(null);
    load();
  };

  const submitWithdrawal = async (e: FormEvent) => {
    e.preventDefault();
    if (!isArtist) return toast.error("Réservé aux artistes");
    if (wAmount < 500) return toast.error("Minimum 500 MA.CA");
    if (wAmount > balance) return toast.error("Solde insuffisant");
    if (!/^03\d{8}$/.test(wNumber.trim())) return toast.error("Numéro Mvola invalide (ex: 0346812942)");
    setWBusy(true);
    const { error } = await supabase.rpc("request_withdrawal", { _amount: wAmount, _mvola: wNumber.trim() });
    setWBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Demande de paiement envoyée");
    setWNumber("");
    refresh();
    load();
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <header className="mb-4 flex items-center gap-2">
        <Wallet className="h-6 w-6 text-amber-400" />
        <h1 className="text-2xl font-bold">Portefeuille</h1>
      </header>

      {/* Balance */}
      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-700/5 p-5">
        <p className="text-xs uppercase tracking-wide text-amber-300/80">Solde actuel</p>
        <p className="mt-1 flex items-center gap-2 text-3xl font-bold text-amber-300">
          <Coins className="h-7 w-7" /> {balance} <span className="text-base font-semibold">MA.CA</span>
        </p>
        <p className="mt-1 text-xs text-amber-300/70">≈ {formatAr(balance * 10)} • 1 MA.CA = 10 Ar</p>
      </div>

      {/* Recharge */}
      <section className="mb-6 rounded-2xl border border-border/60 bg-gradient-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <ArrowDownToLine className="h-4 w-4 text-primary-glow" /> Recharger via Mvola
        </h2>
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          <p className="mb-1 font-semibold">Étape 1 — Faites un dépôt Mvola au :</p>
          <button onClick={copyMvola} className="flex w-full items-center justify-between rounded-lg bg-background/60 px-3 py-2 font-mono text-sm font-bold">
            <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> {MVOLA_NUMBER}</span>
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">Étape 2 — Choisis le pack et renseigne ta référence de transaction ci-dessous.</p>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {PACKS.map((p) => (
            <button
              key={p.ar}
              type="button"
              onClick={() => setPack(p)}
              className={`rounded-xl border p-3 text-left transition ${pack?.ar === p.ar ? "border-amber-400 bg-amber-500/10" : "border-border bg-background/50"}`}
            >
              <p className="text-sm font-bold">{p.ar.toLocaleString("fr-FR")} Ar</p>
              <p className="text-xs text-amber-300">+{p.maca} MA.CA</p>
            </button>
          ))}
        </div>

        <form onSubmit={submitDeposit} className="space-y-2">
          <input
            type="text"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Référence de la transaction Mvola"
            maxLength={64}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={submitting || !pack}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-2.5 text-xs font-bold shadow-glow disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
            Enregistrer mon dépôt
          </button>
        </form>
      </section>

      {/* Withdrawals (artists) */}
      {isArtist && (
        <section className="mb-6 rounded-2xl border border-border/60 bg-gradient-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ArrowUpFromLine className="h-4 w-4 text-primary-glow" /> Demander mon salaire
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">Seuil : 500 MA.CA (5 000 Ar) minimum.</p>
          <form onSubmit={submitWithdrawal} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={wAmount}
                onChange={(e) => setWAmount(parseInt(e.target.value || "0", 10))}
                min={500}
                step={50}
                max={balance}
                className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                placeholder="Montant MA.CA"
                required
              />
              <input
                type="tel"
                value={wNumber}
                onChange={(e) => setWNumber(e.target.value)}
                placeholder="Numéro Mvola"
                pattern="03[0-9]{8}"
                className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Tu recevras : {formatAr(wAmount * 10)}</p>
            <button
              type="submit"
              disabled={wBusy || balance < 500 || wAmount > balance}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-2.5 text-xs font-bold shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
            >
              {wBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
              {balance < 500 ? `Solde minimum 500 MA.CA (actuel ${balance})` : "Demander mon salaire"}
            </button>
          </form>
        </section>
      )}

      {/* History */}
      {deposits.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Mes dépôts</h3>
          <div className="space-y-2">
            {deposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-xs">
                <div>
                  <p className="font-semibold">+{d.maca_amount} MA.CA <span className="text-muted-foreground">({d.amount_ar} Ar)</span></p>
                  <p className="text-[10px] text-muted-foreground">Réf: {d.transaction_ref}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {withdrawals.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Mes retraits</h3>
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-xs">
                <div>
                  <p className="font-semibold">−{w.maca_amount} MA.CA <span className="text-muted-foreground">({w.amount_ar} Ar)</span></p>
                  <p className="text-[10px] text-muted-foreground">Vers {w.mvola_number}</p>
                </div>
                <StatusBadge status={w.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    en_attente: "bg-amber-500/15 text-amber-400",
    valide: "bg-green-500/15 text-green-400",
    paye: "bg-green-500/15 text-green-400",
    refuse: "bg-red-500/15 text-red-400",
  };
  const labels: Record<string, string> = {
    en_attente: "En attente",
    valide: "Validé",
    paye: "Payé",
    refuse: "Refusé",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[status] ?? ""}`}>{labels[status] ?? status}</span>;
}
