import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import apiInstance, { BASE_URL, queryClient } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { appToast } from "@/utils/toast";
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { CustomModal } from "@/components/modals/custom-modal";
import { Button } from "@/components/ui/button";
import FileUploadButton from "@/components/file-upload-button";
import { usePdfUpload } from "@/hooks/upload/useAssetUpload";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CampaignSelect } from "@/components/commons/selects/campaign-select";
import AdInfiniteSelect from "@/components/commons/selects/ad/ad-infinite-select";

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
  Clock3,
  Filter,
  Loader2,
  Receipt,
} from "lucide-react";

type PaymentStatus =
  | "created"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

type OfflinePaymentPurpose =
  | "web3-launch-campaign"
  | "ad-experience-subscription"
  | "soul-bound-subscription";

type AddressStatus = "unaddressed" | "addressed" | null;
type AddressStatusValue = Exclude<AddressStatus, null>;

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

type OfflineMetadata = {
  addressStatus?: AddressStatus;
  expiresAt?: string | null;
};

type SoulBoundMetadata = {
  reportLink?: string | null;
};

type PaymentMetadata = {
  offline?: OfflineMetadata | null;
  soulBoundSubscription?: SoulBoundMetadata | null;
};

type PaymentEntry = {
  _id: string;
  externalAccountId?: ExternalAccount | null;
  stripePaymentIntentId: string;
  status: PaymentStatus;
  currency: string;
  amount: number;
  paymentBreakdown?: PaymentBreakdown | null;
  purpose: OfflinePaymentPurpose;
  metadata?: PaymentMetadata | null;
  context?: unknown;
  invoiceUrl?: string | null;
  reportLink?: string | null;
  addressStatus?: AddressStatus;
  expiresAt?: string | null;
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

type PersistedFilters = {
  statusFilter: "all" | PaymentStatus;
  purposeFilter: "all" | OfflinePaymentPurpose;
};

type AddressModalState = {
  paymentId: string;
  purpose: OfflinePaymentPurpose;
  addressStatus: AddressStatusValue;
  title: string;
  message: string;
  existingReportLink: string | null;
};

const offlinePaymentPurposeZod = z.enum([
  "web3-launch-campaign",
  "ad-experience-subscription",
  "soul-bound-subscription",
]);

const addressModalFormSchema = z
  .object({
    paymentId: z.string().trim().min(1),
    purpose: offlinePaymentPurposeZod,
    addressStatus: z.enum(["unaddressed", "addressed"]),
    campaignId: z.string().default(""),
    adId: z.string().default(""),
    reportFile: z.union([z.instanceof(File), z.null()]).optional(),
  })
  .superRefine((value, ctx) => {
    const isAddressing = value.addressStatus === "addressed";
    if (!isAddressing) return;

    if (
      value.purpose === "web3-launch-campaign" &&
      value.campaignId.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["campaignId"],
        message: "Campaign ID is required.",
      });
    }

    if (
      value.purpose === "ad-experience-subscription" &&
      value.adId.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adId"],
        message: "Ad ID is required.",
      });
    }

    if (value.purpose === "soul-bound-subscription") {
      const file = value.reportFile;
      if (!(file instanceof File)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reportFile"],
          message: "Report PDF is required.",
        });
        return;
      }
      const name = file.name.toLowerCase();
      const mime = file.type.toLowerCase();
      const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
      if (!isPdf) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reportFile"],
          message: "Only PDF files are allowed.",
        });
      }
    }
  });

type AddressModalFormValues = z.infer<typeof addressModalFormSchema>;

function getAddressModalDefaultValues(): AddressModalFormValues {
  return {
    paymentId: "",
    purpose: "soul-bound-subscription",
    addressStatus: "addressed",
    campaignId: "",
    adId: "",
    reportFile: null,
  };
}

const EmptyIcon = () => null;

const DEFAULT_STATUSES: PaymentStatus[] = [
  "created",
  "processing",
  "succeeded",
  "failed",
  "canceled",
];

const DEFAULT_PURPOSES: OfflinePaymentPurpose[] = [
  "soul-bound-subscription",
  "ad-experience-subscription",
  "web3-launch-campaign",
];

const STORAGE_KEY = "xpoll_admin_offlinePaymentLedger_filters_v1";

function safeParseJSON<T>(v: string | null): T | null {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function buildQueryString(params: Record<string, string | number | boolean>) {
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

function purposeLabel(purpose: OfflinePaymentPurpose) {
  if (purpose === "web3-launch-campaign") return "Web3 Launch Campaign";
  if (purpose === "ad-experience-subscription")
    return "Ad Experience Subscription";
  return "Soul-bound Subscription";
}

function paymentStatusLabel(s: PaymentStatus) {
  if (s === "succeeded") return "Success";
  if (s === "failed") return "Failed";
  if (s === "canceled") return "Canceled";
  return "Pending";
}

function readRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function readString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function getEntryAddressStatus(entry: PaymentEntry): AddressStatus {
  const metadata = readRecord(entry.metadata);
  const offline = readRecord(metadata?.offline);
  const statusRaw = readString(offline?.addressStatus) ?? readString(entry.addressStatus);
  if (statusRaw === "addressed" || statusRaw === "unaddressed") return statusRaw;
  return null;
}

function getEntryExpiresAt(entry: PaymentEntry): string | null {
  const metadata = readRecord(entry.metadata);
  const offline = readRecord(metadata?.offline);
  return readString(offline?.expiresAt) ?? readString(entry.expiresAt);
}

function getEntryCampaignId(entry: PaymentEntry): string | null {
  const context = readRecord(entry.context);
  return readString(context?.campaignId);
}

function getEntryAdId(entry: PaymentEntry): string | null {
  const context = readRecord(entry.context);
  return readString(context?.adId);
}

function getEntryReportLink(entry: PaymentEntry): string | null {
  const metadata = readRecord(entry.metadata);
  const soulbound = readRecord(metadata?.soulBoundSubscription);
  return readString(soulbound?.reportLink) ?? readString(entry.reportLink);
}

function formatCountdown(diffMs: number) {
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getExpiryCountdown(expiresAt: string | null | undefined, nowMs: number) {
  if (!expiresAt) return null;
  const ts = new Date(expiresAt).getTime();
  if (Number.isNaN(ts)) return null;

  const diff = ts - nowMs;
  if (diff <= 0) {
    return { text: "Expired", isExpired: true };
  }

  return {
    text: formatCountdown(diff),
    isExpired: false,
  };
}

function useNowTick(stepMs = 1000) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, stepMs);

    return () => window.clearInterval(id);
  }, [stepMs]);

  return nowMs;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  const errObj = readRecord(error);
  const response = readRecord(errObj?.response);
  const data = readRecord(response?.data);
  const message = readString(data?.message) ?? readString(errObj?.message);
  return message ?? fallback;
}

function useOfflinePaymentsQuery({
  page,
  pageSize,
  statuses,
  purposes,
}: {
  page: number;
  pageSize: number;
  statuses: PaymentStatus[];
  purposes: OfflinePaymentPurpose[];
}) {
  const statusParam = statuses.join(",");
  const purposeParam = purposes.join(",");

  return useQuery({
    queryKey: [
      "assetLedgerOfflinePayments",
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
        offlineOnly: true,
        page,
        pageSize,
      });
      const url = `${BASE_URL}${path}?${qs}`;
      const res = await apiInstance.get<PaymentsResponse>(url);
      return res.data;
    },
  });
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const cls =
    status === "succeeded"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "processing"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "failed" || status === "canceled"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-wider leading-none",
        cls,
      )}
    >
      {status}
    </span>
  );
}

function AddressStatusBadge({ status }: { status: AddressStatus }) {
  const cls =
    status === "addressed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "unaddressed"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-wider leading-none",
        cls,
      )}
    >
      {status === "addressed"
        ? "Addressed"
        : status === "unaddressed"
          ? "Unaddressed"
          : "Unknown"}
    </span>
  );
}

function PurposePill({ purpose }: { purpose: OfflinePaymentPurpose }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-secondary px-3 text-[11px] font-semibold text-foreground/80 leading-none">
      {purposeLabel(purpose)}
    </span>
  );
}

function FieldRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
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
  nowMs,
  onAddressAction,
}: {
  entry: PaymentEntry;
  nowMs: number;
  onAddressAction: (
    entry: PaymentEntry,
    addressStatus: AddressStatusValue,
  ) => void;
}) {
  const avatarUrl = entry?.externalAccountId?.avatar?.imageUrl;
  const userId = entry?.externalAccountId?._id || "-";
  const username = entry?.externalAccountId?.username || "-";

  const context = readRecord(entry.context);
  const fulfillment = readRecord(context?.fulfillment);
  const contextProduct = readRecord(context?.product);

  const offlineProductId =
    readString(context?.offlineProductId) ??
    readString(fulfillment?.offlineProductId) ??
    entry.purpose;

  const productName =
    readString(context?.productName) ??
    readString(contextProduct?.name) ??
    purposeLabel(entry.purpose);

  const currentAddressStatus = getEntryAddressStatus(entry);
  const expiresAt = getEntryExpiresAt(entry);
  const linkedCampaignId = getEntryCampaignId(entry);
  const linkedAdId = getEntryAdId(entry);
  const reportLink = getEntryReportLink(entry);
  const countdown = getExpiryCountdown(expiresAt, nowMs);

  const nextAddressStatus: AddressStatusValue =
    currentAddressStatus === "addressed" ? "unaddressed" : "addressed";

  const actions = [
    {
      name:
        nextAddressStatus === "addressed"
          ? "Mark Addressed"
          : "Mark Unaddressed",
      icon: EmptyIcon,
      onClick: () => onAddressAction(entry, nextAddressStatus),
    },
  ];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-background shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-xl",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/[0.05] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="p-5">
        <div className="flex items-start gap-3">
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

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="truncate text-sm font-semibold text-foreground">
                {username}
              </div>
              <div className="shrink-0">
                <ThreeDotMenu label="Address Status" actions={actions} />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <PurposePill purpose={entry.purpose} />
              <div className="flex items-center gap-2">
                <StatusBadge status={entry.status} />
                <AddressStatusBadge status={currentAddressStatus} />
              </div>
            </div>

            <div className="mt-2 text-[11px] text-muted-foreground">
              Payment ID:
            </div>
            <div className="font-mono text-[12px] text-foreground/70 break-all">
              {entry.stripePaymentIntentId}
            </div>
          </div>
        </div>

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

        <div className="mt-4 space-y-2">
          <FieldRow label="User ID" value={userId} mono />
          <FieldRow label="User Name" value={username} />
          <FieldRow label="Product Name" value={productName} />
          <FieldRow label="Product ID" value={offlineProductId} mono />
          <FieldRow label="Payment Status" value={paymentStatusLabel(entry.status)} />
          <FieldRow
            label="Payment ID"
            value={entry.stripePaymentIntentId}
            mono
          />
          <FieldRow
            label="Expires At"
            value={expiresAt ? isoToLocal(expiresAt) : "-"}
          />
          <FieldRow label="Campaign ID" value={linkedCampaignId} mono />
          <FieldRow label="Ad ID" value={linkedAdId} mono />
          <FieldRow
            label="Report Link"
            value={
              reportLink ? (
                <a
                  href={reportLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue underline hover:opacity-80"
                >
                  Open Report
                </a>
              ) : null
            }
          />

          {countdown ? (
            <FieldRow
              label="Expiry Countdown"
              value={
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    countdown.isExpired ? "text-red-600" : "text-amber-600",
                  )}
                >
                  <Clock3 className="h-3.5 w-3.5" />
                  {countdown.text}
                </span>
              }
            />
          ) : null}
        </div>

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

export default function OfflinePaymentLedgerCardsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>(
    "all",
  );
  const [purposeFilter, setPurposeFilter] = useState<
    "all" | OfflinePaymentPurpose
  >("all");

  const [addressModal, setAddressModal] = useState<AddressModalState | null>(
    null,
  );

  const nowMs = useNowTick(1000);

  useEffect(() => {
    const parsed = safeParseJSON<PersistedFilters>(
      localStorage.getItem(STORAGE_KEY),
    );
    if (!parsed) return;

    if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
    if (parsed.purposeFilter) setPurposeFilter(parsed.purposeFilter);
  }, []);

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

  useEffect(() => setPage(1), [statusFilter, purposeFilter]);

  const q = useOfflinePaymentsQuery({
    page,
    pageSize,
    statuses,
    purposes,
  });

  const total = q.data?.data?.total ?? 0;
  const entries = safeArr<PaymentEntry>(q.data?.data?.entries);
  const { uploadPdf, loading: reportUploadLoading } = usePdfUpload();

  const addressForm = useForm<AddressModalFormValues>({
    resolver: zodResolver(addressModalFormSchema),
    defaultValues: getAddressModalDefaultValues(),
  });

  const addressMutation = useMutation({
    mutationFn: async ({
      paymentId,
      addressStatus,
      campaignId,
      adId,
      reportLink,
    }: {
      paymentId: string;
      addressStatus: AddressStatusValue;
      campaignId?: string;
      adId?: string;
      reportLink?: string;
    }) => {
      const route =
        endpoints.entities.assetLedger.updateOfflinePaymentAddressStatus(
          paymentId,
        );
      const url = `${BASE_URL}${route}`;
      const payload: Record<string, unknown> = { addressStatus };
      if (campaignId) payload.campaignId = campaignId;
      if (adId) payload.adId = adId;
      if (reportLink) payload.reportLink = reportLink;
      const response = await apiInstance.patch(url, payload);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      appToast.success(
        variables.addressStatus === "addressed"
          ? "Marked as addressed"
          : "Marked as unaddressed",
      );
      setAddressModal(null);
      addressForm.reset(getAddressModalDefaultValues());
      queryClient.invalidateQueries({
        queryKey: ["assetLedgerOfflinePayments"],
      });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, "Failed to update address status");
      appToast.error(message);
    },
  });

  const handleAddressAction = (
    entry: PaymentEntry,
    addressStatus: AddressStatusValue,
  ) => {
    const username = entry?.externalAccountId?.username || "this user";
    const actionTitle =
      addressStatus === "addressed"
        ? "Mark Payment as Addressed"
        : "Mark Payment as Unaddressed";

    const actionMessage =
      addressStatus === "addressed"
        ? `Confirm marking this offline payment for ${username} as addressed.`
        : `Confirm marking this offline payment for ${username} as unaddressed.`;

    setAddressModal({
      paymentId: entry._id,
      purpose: entry.purpose,
      addressStatus,
      title: actionTitle,
      message: actionMessage,
      existingReportLink: getEntryReportLink(entry),
    });

    addressForm.reset({
      paymentId: entry._id,
      purpose: entry.purpose,
      addressStatus,
      campaignId: getEntryCampaignId(entry) ?? "",
      adId: getEntryAdId(entry) ?? "",
      reportFile: null,
    });
  };

  const submitAddressModal = addressForm.handleSubmit(async (values) => {
    if (addressMutation.isPending || reportUploadLoading) return;

    const isAddressing = values.addressStatus === "addressed";
    let uploadedReportLink: string | undefined;

    if (isAddressing && values.purpose === "soul-bound-subscription") {
      const file = values.reportFile;
      if (!(file instanceof File)) return;
      try {
        uploadedReportLink = await uploadPdf(file, true);
      } catch (error) {
        appToast.error(getErrorMessage(error, "Failed to upload report PDF"));
        return;
      }
    }

    addressMutation.mutate({
      paymentId: values.paymentId,
      addressStatus: values.addressStatus,
      ...(isAddressing && values.purpose === "web3-launch-campaign"
        ? { campaignId: values.campaignId.trim() }
        : {}),
      ...(isAddressing && values.purpose === "ad-experience-subscription"
        ? { adId: values.adId.trim() }
        : {}),
      ...(isAddressing && values.purpose === "soul-bound-subscription"
        ? { reportLink: uploadedReportLink }
        : {}),
    });
  });

  const isAddressActionPending = addressMutation.isPending || reportUploadLoading;
  const selectMenuPortalTarget =
    typeof window === "undefined" ? undefined : document.body;

  return (
    <main className="min-h-screen text-foreground">
      <div className="sticky top-0 z-10 border-b border-border bg-sidebar/80 backdrop-blur rounded-xl mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Offline Payment Ledger</h1>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mr-1">
            <Filter className="h-4 w-4" />
            Filters
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | PaymentStatus)}
          >
            <SelectTrigger className="h-10 w-[180px] rounded-full border-border bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={purposeFilter}
            onValueChange={(v) =>
              setPurposeFilter(v as "all" | OfflinePaymentPurpose)
            }
          >
            <SelectTrigger className="h-10 w-[250px] rounded-full border-border bg-background">
              <SelectValue placeholder="Payment purpose" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="soul-bound-subscription">
                Soul-bound Subscription
              </SelectItem>
              <SelectItem value="ad-experience-subscription">
                Ad Experience Subscription
              </SelectItem>
              <SelectItem value="web3-launch-campaign">
                Web3 Launch Campaign
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading offline payments...
          </div>
        ) : q.isError ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            Failed to load offline payments.
          </div>
        ) : (
          <>
            {entries.length === 0 ? (
              <div className="rounded-3xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
                No offline payments found for selected filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entries?.map((entry) => (
                  <PaymentCard
                    key={entry._id}
                    entry={entry}
                    nowMs={nowMs}
                    onAddressAction={handleAddressAction}
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

      {addressModal ? (
        <CustomModal
          isOpen
          onClose={() => {
            if (isAddressActionPending) return;
            setAddressModal(null);
            addressForm.reset(getAddressModalDefaultValues());
          }}
          title={addressModal.title}
          onSubmit={() => {
            submitAddressModal();
          }}
          submitButtonText={
            addressModal.addressStatus === "addressed"
              ? "Mark Addressed"
              : "Mark Unaddressed"
          }
          submitButtonProps={{
            disabled: isAddressActionPending,
          }}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (isAddressActionPending) return;
                  setAddressModal(null);
                  addressForm.reset(getAddressModalDefaultValues());
                }}
                disabled={isAddressActionPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  submitAddressModal();
                }}
                disabled={isAddressActionPending}
              >
                {isAddressActionPending
                  ? reportUploadLoading
                    ? "Uploading PDF..."
                    : "Submitting..."
                  : addressModal.addressStatus === "addressed"
                    ? "Mark Addressed"
                    : "Mark Unaddressed"}
              </Button>
            </div>
          }
        >
          <p className="mb-3">{addressModal.message}</p>
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">Payment ID:</span>{" "}
              <span className="font-mono">{addressModal.paymentId}</span>
            </div>
          </div>

          {addressModal.addressStatus === "addressed" &&
          addressModal.purpose === "web3-launch-campaign" ? (
            <Form {...addressForm}>
              <FormField
                control={addressForm.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormLabel className="text-xs font-semibold text-foreground">
                      Campaign *
                    </FormLabel>
                    <FormControl>
                      <CampaignSelect
                        placeholder="Search and select campaign..."
                        onChange={(option) => field.onChange(option?.value ?? "")}
                        selectProps={{
                          value: field.value
                            ? {
                                value: field.value,
                                label: field.value,
                              }
                            : null,
                          onBlur: field.onBlur,
                          menuPortalTarget: selectMenuPortalTarget,
                          menuPosition: "fixed",
                        }}
                      />
                    </FormControl>
                    {field.value ? (
                      <p className="text-xs text-muted-foreground">
                        Selected ID:{" "}
                        <span className="font-mono text-foreground/80">
                          {field.value}
                        </span>
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          ) : null}

          {addressModal.addressStatus === "addressed" &&
          addressModal.purpose === "ad-experience-subscription" ? (
            <Form {...addressForm}>
              <FormField
                control={addressForm.control}
                name="adId"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormLabel className="text-xs font-semibold text-foreground">
                      Ad *
                    </FormLabel>
                    <FormControl>
                      <AdInfiniteSelect
                        placeholder="Search and select ad..."
                        onChange={(option) => field.onChange(option?.value ?? "")}
                        selectProps={{
                          value: field.value
                            ? {
                                value: field.value,
                                label: field.value,
                              }
                            : null,
                          onBlur: field.onBlur,
                          menuPortalTarget: selectMenuPortalTarget,
                          menuPosition: "fixed",
                        }}
                      />
                    </FormControl>
                    {field.value ? (
                      <p className="text-xs text-muted-foreground">
                        Selected ID:{" "}
                        <span className="font-mono text-foreground/80">
                          {field.value}
                        </span>
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          ) : null}

          {addressModal.addressStatus === "addressed" &&
          addressModal.purpose === "soul-bound-subscription" ? (
            <Form {...addressForm}>
              <FormField
                control={addressForm.control}
                name="reportFile"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormLabel className="text-xs font-semibold text-foreground">
                      Report PDF *
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <FileUploadButton
                          accept="application/pdf,.pdf"
                          buttonProps={{
                            disabled: isAddressActionPending,
                            className: "h-9 rounded-full",
                          }}
                          onChange={(e) => {
                            const selected = e.target.files?.[0] ?? null;
                            field.onChange(selected);
                          }}
                        >
                          {field.value instanceof File
                            ? "Change PDF"
                            : "Upload PDF"}
                        </FileUploadButton>

                        {field.value instanceof File ? (
                          <p className="text-xs text-muted-foreground">
                            Selected:{" "}
                            <span className="font-medium text-foreground">
                              {field.value.name}
                            </span>
                          </p>
                        ) : addressModal.existingReportLink ? (
                          <a
                            href={addressModal.existingReportLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue underline"
                          >
                            Current report link
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Upload a PDF report file.
                          </p>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          ) : null}
        </CustomModal>
      ) : null}
    </main>
  );
}
