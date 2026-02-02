import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import apiInstance, { BASE_URL } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Receipt,
} from "lucide-react";
import { plusPlans } from "@/utils/plans";

type PaymentStatus = "created" | "processing" | "succeeded";
type PaymentPurpose = "purchase-campaign-plan" | "purchase-asset-token";

type Avatar = { name?: string; imageUrl?: string };

type ExternalAccount = {
  _id: string;
  username?: string;
  avatar?: Avatar | null;
};

type PaymentBreakdown = {
  paymentAmountMinor: number | null;
  processingAmountMinor: number | null;
  platformFeesAmountMinor: number | null;
  netReceivedAmountMinor: number | null;
};

type PaymentEntry = {
  _id: string;
  externalAccountId?: ExternalAccount | null;
  stripePaymentIntentId: string;
  status: PaymentStatus;
  currency: string;
  amount: number; // ⚠️ you said it's like 1000, 1500 etc (Stripe minor)
  paymentBreakdown?: PaymentBreakdown | null;
  purpose: PaymentPurpose;
  context?: any;
  invoiceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaymentsResponse = {
  data: {
    total: number;
    entries: PaymentEntry[];
    page: number;
    pageSize: number;
  };
};

/** -----------------------------
 *  Defaults
 *  ---------------------------- */
const DEFAULT_STATUSES: PaymentStatus[] = [
  "created",
  "processing",
  "succeeded",
];
const DEFAULT_PURPOSES: PaymentPurpose[] = [
  "purchase-campaign-plan",
  "purchase-asset-token",
];

/** -----------------------------
 *  Persisted filters
 *  ---------------------------- */
const STORAGE_KEY = "xpoll_admin_paymentLedger_filters_v1";

type PersistedFilters = {
  statusFilter: "all" | PaymentStatus;
  purposeFilter: "all" | PaymentPurpose;
};

function safeParseJSON<T>(v: string | null): T | null {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

/** -----------------------------
 *  Helpers
 *  ---------------------------- */
function safeArr<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  return sp.toString();
}

function formatMoneyFromMinor(amountMinor: number, currency: string) {
  const value = amountMinor / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value);
}

function isoToLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function getWindowPages(
  totalPages: number,
  current: number,
  before = 3,
  after = 3,
) {
  const start = Math.max(1, current - before);
  const end = Math.min(totalPages, current + after);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

/** Payment label asked: Success/Failed (but you filter created/processing too) */
function paymentStatusLabel(s: PaymentStatus) {
  if (s === "succeeded") return "Success";
  if (s === "processing" || s === "created") return "Pending";
  return "Failed";
}

function monthsFromPlanId(planId: string | null) {
  if (!planId) return null;
  if (planId.includes("_1M_")) return "1 month";
  if (planId.includes("_3M_")) return "3 months";
  if (planId.includes("_6M_")) return "6 months";
  return null;
}

function politicalFromPlanId(planId: string | null) {
  if (!planId) return null;
  // NP_* => non-political, P_* => political (based on your naming)
  if (planId.startsWith("NP_")) return "non-political";
  if (planId.startsWith("P_")) return "political";
  return null;
}

function getCampaignType(planId: string | null) {
  const m = monthsFromPlanId(planId);
  const pol = politicalFromPlanId(planId);
  if (!m && !pol) return null;
  if (m && pol) return `${m} (${pol})`;
  return m || pol || null;
}

function hasDataAccess(planId: string | null) {
  if (!planId) return false;
  return (plusPlans as readonly string[]).includes(planId);
}

/** -----------------------------
 *  Query
 *  ---------------------------- */
function usePaymentsQuery({
  page,
  pageSize,
  statuses,
  purposes,
}: {
  page: number;
  pageSize: number;
  statuses: PaymentStatus[];
  purposes: PaymentPurpose[];
}) {
  const statusParam = statuses.join(",");
  const purposeParam = purposes.join(",");

  return useQuery({
    queryKey: [
      "assetLedgerPayments",
      page,
      pageSize,
      statusParam,
      purposeParam,
    ],
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const path = endpoints.entities.assetLedger.allPayments;
      const qs = buildQueryString({
        status: statusParam,
        paymentIntentPurpose: purposeParam,
        page,
        pageSize,
      });
      const url = `${BASE_URL}${path}?${qs}`;
      const res = await apiInstance.get<PaymentsResponse>(url);
      return res.data;
    },
  });
}

/** -----------------------------
 *  UI Bits
 *  ---------------------------- */
function StatusBadge({ status }: { status: PaymentStatus }) {
  const cls =
    status === "succeeded"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "processing"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        cls,
      )}
    >
      {status}
    </span>
  );
}

function PurposePill({ purpose }: { purpose: PaymentPurpose }) {
  const label =
    purpose === "purchase-campaign-plan"
      ? "Campaign Plan"
      : "Asset Token Purchase";

  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground/80">
      {label}
    </span>
  );
}

function FieldRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("truncate text-foreground/90", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

function PaymentCard({
  entry,
  campaignTotalsById,
  campaignTotalsByName,
}: {
  entry: PaymentEntry;
  campaignTotalsById: Record<string, number>;
  campaignTotalsByName: Record<string, number>;
}) {
  const avatarUrl = entry?.externalAccountId?.avatar?.imageUrl;
  const userId = entry?.externalAccountId?._id || "—";
  const username = entry?.externalAccountId?.username || "—";

  const planId: string | null =
    typeof entry?.context?.planId === "string" ? entry.context.planId : null;

  const campaignName: string | null =
    typeof entry?.context?.create_campaign?.name === "string"
      ? entry.context.create_campaign.name
      : null;

  const campaignId: string | null =
    typeof entry?.context?.fulfillment?.campaignId === "string"
      ? entry.context.fulfillment.campaignId
      : null;

  const showCampaignExtras = entry.purpose === "purchase-campaign-plan";

  const campaignType = showCampaignExtras ? getCampaignType(planId) : null;
  const dataAccess = showCampaignExtras
    ? hasDataAccess(planId)
      ? "On"
      : "Off"
    : null;

  const totalForThisCampaignMinor =
    (campaignId ? campaignTotalsById[campaignId] : 0) ||
    (campaignName ? campaignTotalsByName[campaignName] : 0) ||
    0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-background shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-xl",
      )}
    >
      {/* subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/[0.05] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="p-5">
        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-secondary shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold text-foreground">
                  {username}
                </div>
                <PurposePill purpose={entry.purpose} />
              </div>

              <div className="mt-0.5 text-[12px] text-muted-foreground">
                Payment ID:{" "}
                <span className="font-mono text-foreground/70">
                  {entry.stripePaymentIntentId}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={entry.status} />
          </div>
        </div>

        {/* amount */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-secondary p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Amount
            </div>
            <div className="mt-1 text-lg font-bold text-foreground">
              {formatMoneyFromMinor(entry.amount, entry.currency)}
            </div>
          </div>

          <div className="rounded-2xl bg-secondary p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Date & Time
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground/80">
              {isoToLocal(entry.createdAt)}
            </div>
          </div>
        </div>

        {/* required fields list */}
        <div className="mt-4 space-y-2">
          <FieldRow label="User ID" value={userId} mono />
          <FieldRow label="User Name" value={username} />
          <FieldRow label="Campaign Name" value={campaignName ?? "—"} />
          {showCampaignExtras ? (
            <>
              <FieldRow label="Campaign Type" value={campaignType ?? "—"} />
              <FieldRow label="Get data access" value={dataAccess ?? "—"} />
            </>
          ) : null}

          <FieldRow
            label="Total Payment done"
            value={formatMoneyFromMinor(
              totalForThisCampaignMinor,
              entry.currency,
            )}
          />

          <FieldRow
            label="Payment Status"
            value={paymentStatusLabel(entry.status)}
          />

          <FieldRow
            label="Payment ID"
            value={entry.stripePaymentIntentId}
            mono
          />

          <FieldRow label="Campaign ID" value={campaignId ?? "—"} mono />
        </div>

        {/* actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[11px] font-mono text-muted-foreground">
            Internal ID: {entry._id}
          </div>

          {entry.invoiceUrl ? (
            <a
              href={entry.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2",
                "text-xs font-semibold text-foreground/80",
                "hover:bg-secondary transition-colors",
              )}
            >
              <Receipt className="h-4 w-4" />
              Invoice
            </a>
          ) : null}
        </div>

        {/* tiny note */}
        <div className="mt-2 text-[11px] text-muted-foreground">
          Total Payment done is calculated from currently loaded entries
          (pagination).
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = getWindowPages(totalPages, page, 3, 3);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Total: <span className="font-semibold text-foreground">{total}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange(page - 1)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
            "transition-colors",
            canPrev
              ? "border-border hover:bg-secondary text-foreground/80"
              : "border-border text-muted-foreground cursor-not-allowed",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        <div className="flex items-center gap-1">
          {pages?.map((p) => {
            const active = p === page;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  "h-9 w-9 rounded-full text-sm font-semibold transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background border border-border text-foreground/70 hover:bg-secondary",
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          disabled={!canNext}
          onClick={() => canNext && onPageChange(page + 1)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
            "transition-colors",
            canNext
              ? "border-border hover:bg-secondary text-foreground/80"
              : "border-border text-muted-foreground cursor-not-allowed",
          )}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** -----------------------------
 *  Page
 *  ---------------------------- */
export default function PaymentLedgerCardsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // ✅ default "all" => created,processing,succeeded and both purposes
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>(
    "all",
  );
  const [purposeFilter, setPurposeFilter] = useState<"all" | PaymentPurpose>(
    "all",
  );

  // ✅ Restore persisted filters once
  useEffect(() => {
    const parsed = safeParseJSON<PersistedFilters>(
      localStorage.getItem(STORAGE_KEY),
    );
    if (!parsed) return;

    if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
    if (parsed.purposeFilter) setPurposeFilter(parsed.purposeFilter);
  }, []);

  // ✅ Persist when filters change
  useEffect(() => {
    const payload: PersistedFilters = { statusFilter, purposeFilter };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [statusFilter, purposeFilter]);

  const statuses = useMemo(() => {
    if (statusFilter === "all") return DEFAULT_STATUSES;
    return [statusFilter];
  }, [statusFilter]);

  const purposes = useMemo(() => {
    if (purposeFilter === "all") return DEFAULT_PURPOSES;
    return [purposeFilter];
  }, [purposeFilter]);

  // reset page when filters change
  useEffect(() => setPage(1), [statusFilter, purposeFilter]);

  const q = usePaymentsQuery({ page, pageSize, statuses, purposes });

  const total = q.data?.data?.total ?? 0;
  const entries = safeArr<PaymentEntry>(q.data?.data?.entries);

  // ✅ totals computed from CURRENT LOADED ENTRIES
  const { campaignTotalsById, campaignTotalsByName } = useMemo(() => {
    const byId: Record<string, number> = {};
    const byName: Record<string, number> = {};

    for (const e of entries) {
      const campaignId =
        typeof e?.context?.fulfillment?.campaignId === "string"
          ? e.context.fulfillment.campaignId
          : null;

      const campaignName =
        typeof e?.context?.create_campaign?.name === "string"
          ? e.context.create_campaign.name
          : null;

      if (campaignId)
        byId[campaignId] = (byId[campaignId] ?? 0) + (e.amount || 0);
      if (campaignName)
        byName[campaignName] = (byName[campaignName] ?? 0) + (e.amount || 0);
    }

    return { campaignTotalsById: byId, campaignTotalsByName: byName };
  }, [entries]);

  return (
    <main className="min-h-screen text-foreground">
      {/* top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-sidebar/80 backdrop-blur rounded-xl mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Payment Ledger</h1>

        {/* filters (top right) */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mr-1">
            <Filter className="h-4 w-4" />
            Filters
          </div>

          {/* STATUS */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
          >
            <SelectTrigger className="h-10 w-[170px] rounded-full border-border bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
            </SelectContent>
          </Select>

          {/* PURPOSE */}
          <Select
            value={purposeFilter}
            onValueChange={(v) => setPurposeFilter(v as any)}
          >
            <SelectTrigger className="h-10 w-[210px] rounded-full border-border bg-background">
              <SelectValue placeholder="Payment purpose" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="purchase-campaign-plan">
                Purchase Campaign Plan
              </SelectItem>
              <SelectItem value="purchase-asset-token">
                Purchase Asset Token
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading payments…
          </div>
        ) : q.isError ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            Failed to load payments.
          </div>
        ) : (
          <>
            {entries.length === 0 ? (
              <div className="rounded-3xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
                No payments found for selected filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entries?.map((entry) => (
                  <PaymentCard
                    key={entry._id}
                    entry={entry}
                    campaignTotalsById={campaignTotalsById}
                    campaignTotalsByName={campaignTotalsByName}
                  />
                ))}
              </div>
            )}

            <div className="mt-6">
              <Pagination
                page={page}
                total={total}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
