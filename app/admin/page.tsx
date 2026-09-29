"use client";

import { ArrowLeft, CarTaxiFront, FastForward, LoaderCircle, RotateCcw, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ClaimStatusBadge } from "@/components/claim-status";
import { LedgerEntries } from "@/components/ledger-entries";
import { ErrorState, ListSkeleton } from "@/components/state-views";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/client/api";
import { useFormat } from "@/lib/client/format";
import { useFetch } from "@/lib/client/hooks";
import { useApp } from "@/lib/client/store";
import type { ClaimView } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Tab = "control" | "claims" | "ledger";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("control");
  const state = useFetch(() => api.admin.state(), "admin", 2000);
  const ledger = useFetch(() => api.ledger(), "ledger", 2000);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await Promise.all([state.reload(), ledger.reload()]);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.code}: ${e.message}` : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Vidare</p>
          <h1 className="text-2xl font-bold tracking-tight">Demo admin</h1>
          <p className="text-sm text-muted-foreground">Hidden route for running demos. Moves mock data; nothing here is real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/app">
              <ArrowLeft aria-hidden /> Open app
            </Link>
          </Button>
          <Button
            variant="outline"
            disabled={!!busy}
            onClick={() =>
              run("demo", async () => {
                const { userId } = await api.startDemo();
                useApp.getState().resetFlow();
                useApp.getState().setUserId(userId);
                useApp.getState().setLocation("t-centralen");
              })
            }
          >
            {busy === "demo" ? <LoaderCircle className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />} Start demo
          </Button>
          <Button variant="danger" disabled={!!busy} onClick={() => run("reset", () => api.admin.reset())}>
            {busy === "reset" ? <LoaderCircle className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />} Reset demo data
          </Button>
        </div>
      </header>

      <nav className="flex gap-1 rounded-md bg-muted p-1" aria-label="Admin sections">
        {(["control", "claims", "ledger"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={cn("h-10 flex-1 rounded-sm text-sm font-semibold capitalize", tab === t ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {t === "control" ? "Scenario" : t}
          </button>
        ))}
      </nav>

      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      {state.error && !state.data ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : !state.data ? (
        <ListSkeleton rows={4} />
      ) : tab === "control" ? (
        <ScenarioTab state={state.data} busy={busy} run={run} />
      ) : tab === "claims" ? (
        <ClaimsTab claims={state.data.claims} busy={busy} run={run} />
      ) : (
        <LedgerTab ledger={ledger.data} />
      )}
    </div>
  );
}

type RunFn = (key: string, fn: () => Promise<unknown>) => Promise<void>;
type AdminData = NonNullable<ReturnType<typeof useFetch<Awaited<ReturnType<typeof api.admin.state>>>>["data"]>;

function ScenarioTab({ state, busy, run }: { state: AdminData; busy: string | null; run: RunFn }) {
  const f = useFormat();
  const [templateId, setTemplateId] = useState(state.templates[0]?.id ?? "");
  const [delay, setDelay] = useState<string>("");
  const template = state.templates.find((t) => t.id === templateId);
  const liveRides = state.rides.filter((r) => r.status !== "completed" && r.status !== "cancelled");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-4 text-primary" aria-hidden /> Trigger a disruption
          </CardTitle>
          <CardDescription>Appears in “Disruptions near you” immediately.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tpl">Template</Label>
            <Select id="tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {state.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title.en}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="delay">Expected delay (min)</Label>
            <Input
              id="delay"
              inputMode="numeric"
              placeholder={String(template?.expectedDelayMinutes ?? 30)}
              value={delay}
              onChange={(e) => setDelay(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button
            disabled={!!busy || !templateId}
            onClick={() => run("trigger", () => api.admin.triggerDisruption(templateId, delay ? Number(delay) : undefined))}
          >
            {busy === "trigger" && <LoaderCircle className="animate-spin" aria-hidden />} Trigger now
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CarTaxiFront className="size-4 text-primary" aria-hidden /> Taxi partner
          </CardTitle>
          <CardDescription>Turn off to show the “no taxis available” state.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span id="taxi-av" className="text-sm font-medium">
            Taxis available
          </span>
          <Switch
            aria-labelledby="taxi-av"
            checked={state.taxiAvailable}
            onCheckedChange={(v) => run("taxi", () => api.admin.setTaxiAvailability(v))}
          />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Live rides</CardTitle>
          <CardDescription>Skip a ride ahead to keep a demo moving.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {liveRides.length === 0 && <p className="text-sm text-muted-foreground">No rides in progress.</p>}
          {liveRides.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
              <span className="flex-1 font-medium">
                {r.trip.origin.name} → {r.trip.destination.name}
              </span>
              <Badge>{r.status}</Badge>
              {(["arriving", "inProgress", "completed"] as const).map((to) => (
                <Button key={to} size="sm" variant="outline" disabled={!!busy} onClick={() => run(`ff-${r.id}`, () => api.admin.fastForward(r.id, to))}>
                  <FastForward aria-hidden /> {to}
                </Button>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Disruptions</CardTitle>
          <CardDescription>“Planned” ones were announced ≥ 3 days ago and are never eligible.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {state.disruptions.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.title.en}</p>
                <p className="text-xs text-muted-foreground">
                  +{d.expectedDelayMinutes} min · announced {f.dateTime(d.announcedAt)} · {d.county} · {d.operator}
                </p>
              </div>
              <Switch
                aria-label={`Active: ${d.title.en}`}
                checked={d.active}
                onCheckedChange={(v) => run(`dis-${d.id}`, () => api.admin.setDisruptionActive(d.id, v))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y text-sm">
          {state.users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="flex-1 font-medium">
                {u.name} <span className="font-mono text-xs text-muted-foreground">{u.personnummer}</span>
              </span>
              <Badge variant={u.onboarded ? "success" : "warning"}>{u.onboarded ? "onboarded" : `missing: ${u.missingSteps.join(", ")}`}</Badge>
              <Badge variant={u.risk.flagged ? "danger" : "muted"}>{u.risk.claimsInWindow} claims / 30 d</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ClaimsTab({ claims, busy, run }: { claims: ClaimView[]; busy: string | null; run: RunFn }) {
  const f = useFormat();
  if (!claims.length) return <p className="text-sm text-muted-foreground">No claims yet. Complete a ride in the app.</p>;
  return (
    <div className="flex flex-col gap-4">
      {claims.map((c) => {
        const act = (label: string, status: string, reason?: "userFault" | "other") => (
          <Button
            size="sm"
            variant={reason ? "outline" : "secondary"}
            className={cn(reason && "text-danger")}
            disabled={!!busy}
            onClick={() => run(`c-${c.id}`, () => api.admin.setClaimStatus(c.id, status, reason))}
          >
            {label}
          </Button>
        );
        const balance = c.balance;
        return (
          <Card key={c.id}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>
                  {c.slReference} · {c.userName}
                </CardTitle>
                <CardDescription>
                  {c.payload.tripDetails.from} → {c.payload.tripDetails.to} · filed {f.dateTime(c.submittedAt)} · claimed {f.kr(c.claimedSEK)}
                </CardDescription>
              </div>
              <ClaimStatusBadge status={c.status} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {act("Under review", "underReview")}
                {act("Approve", "approved")}
                {act("Pay out", "paidOut")}
                {act("Reject – user fault", "rejected", "userFault")}
                {act("Reject – other", "rejected", "other")}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="Vidare paid out" value={f.kr(balance.vidareOutSEK)} />
                <Stat label="Vidare got back" value={f.kr(balance.vidareInSEK)} />
                <Stat label="Receivable from SL" value={f.kr(balance.receivableSEK)} />
                <Stat
                  label="Who ends up paying"
                  value={
                    c.status === "paidOut"
                      ? "SL"
                      : c.status === "rejected"
                        ? c.rejectionReason === "userFault"
                          ? "User"
                          : "Vidare (loss)"
                        : "Vidare (pending)"
                  }
                />
              </div>
              <LedgerEntries entries={c.ledger} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

function LedgerTab({ ledger }: { ledger: Awaited<ReturnType<typeof api.ledger>> | null }) {
  const f = useFormat();
  if (!ledger) return <ListSkeleton rows={3} />;
  const t = ledger.totals;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="Paid to taxis" value={f.kr(t.paidToTaxisSEK)} />
        <Stat label="Received from SL" value={f.kr(t.receivedFromSlSEK)} tone="text-success" />
        <Stat label="Charged to users" value={f.kr(t.chargedToUsersSEK)} />
        <Stat label="Written off" value={f.kr(t.writtenOffSEK)} tone="text-danger" />
        <Stat label="Outstanding from SL" value={f.kr(t.outstandingReceivablesSEK)} tone="text-warning" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Per claim</CardTitle>
          <CardDescription>Vidare’s money in and out for each claim.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Claim</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 text-right font-medium">Out</th>
                <th className="py-2 pr-3 text-right font-medium">In</th>
                <th className="py-2 pr-3 text-right font-medium">Loss</th>
                <th className="py-2 pr-3 text-right font-medium">Receivable</th>
                <th className="py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ledger.perClaim.map((c) => (
                <tr key={c.claimId}>
                  <td className="py-2 pr-3">
                    <p className="font-medium">{c.slReference}</p>
                    <p className="text-xs text-muted-foreground">{c.userName}</p>
                  </td>
                  <td className="py-2 pr-3">
                    <ClaimStatusBadge status={c.status} />
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{f.kr(c.balance.vidareOutSEK)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{f.kr(c.balance.vidareInSEK)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{f.kr(c.balance.lossSEK)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{f.kr(c.balance.receivableSEK)}</td>
                  <td className={cn("py-2 text-right font-semibold tabular-nums", c.balance.netSEK < 0 ? "text-danger" : "text-success")}>
                    {f.kr(c.balance.netSEK)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>All money movements</CardTitle>
        </CardHeader>
        <CardContent>
          <LedgerEntries entries={ledger.entries} />
        </CardContent>
      </Card>
    </div>
  );
}
