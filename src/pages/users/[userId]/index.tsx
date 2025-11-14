// src/pages/users/[userId].tsx
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, User as UserIcon, Mail } from "lucide-react";
import { utcToAdminFormatted } from "@/utils/time";
import { endpoints } from "@/api/endpoints";

type SharerAnalytics = {
  sharerExternalAccountId: string;
  linksWithTraffic: number;
  totals: {
    views: number;
    uniques: number;
  };
};

type Avatar = {
  _id: string;
  name: string;
  imageUrl: string;
  country?: string;
};

type XpollAppProfile = {
  username?: string | null;
  avatar?: Avatar | null;
  gender?: string | null;
  dob?: string | null;
  meta?: {
    isDisclaimerAccepted?: boolean;
    isPreferenceSubmitted?: boolean;
    isCertificateGiven?: boolean;
  };
};

type Profile = {
  level: number;
  civicScore: number;
  apps?: {
    xpoll?: XpollAppProfile;
  };
  meta?: {
    city?: {
      _id: string;
      countryId: string;
      countryName: string;
      name: string;
      stateId: string;
      stateName: string;
    };
    state?: {
      _id: string;
      countryId: string;
      name: string;
    };
    country?: {
      _id: string;
      name: string;
    };
  };
};

type AssetMapping = {
  assetType: string;
  amount: string;
};

type UserDetailsPayload = {
  id: string;
  hasEmail: boolean;
  connectedProviders: string[];
  providerCount: number;
  googleEmail: string | null;
  twitterUsername: string | null;
  twitterName: string | null;
  profile?: Profile | null;
  highestLevel: number;
  linkedGrwbAccount: any | null;
  assetMappings: Record<string, AssetMapping>;
};

const UserDetailsPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const url = useMemo(
    () => (userId ? endpoints.users.details(userId) : ""),
    [userId]
  );

  const { data, isLoading, error } = useApiQuery(url, {
    key: ["user-details", userId],
  } as any);

  const payload: UserDetailsPayload | undefined = data?.data?.data;
  const sharerUrl = useMemo(
    () => (userId ? endpoints.users.sharerAnalytics(userId) : ""),
    [userId]
  );

  const {
    data: sharerData,
    isLoading: isLoadingSharer,
    error: sharerError,
  } = useApiQuery(sharerUrl, {
    key: ["user-sharer-analytics", userId],
    enabled: Boolean(userId), // if your hook supports this
  } as any);

  const sharerAnalytics: SharerAnalytics | undefined = sharerData?.data?.data;
  const xpoll = payload?.profile?.apps?.xpoll;
  const avatar = xpoll?.avatar || null;
  const location = payload?.profile?.meta;

  const assets: AssetMapping[] = useMemo(
    () => (payload?.assetMappings ? Object.values(payload.assetMappings) : []),
    [payload]
  );

  const hasAnyTwitter = payload?.twitterUsername || payload?.twitterName;

  return (
    <div className="flex flex-col gap-6 md:px-4 h-full">
      {/* Top bar */}
      <section className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-muted-foreground" />
                User Details
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground break-all">
                ID: {payload?.id || userId}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate(`/users/${userId}/referrals`)}
          >
            Referral links
          </Button>
        </div>

        {/* Loading / error states */}
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading user details…</p>
        )}

        {error && !isLoading && (
          <p className="text-sm text-red-500">Failed to load user details.</p>
        )}

        {!isLoading && !error && !payload && (
          <p className="text-sm text-muted-foreground">No data found.</p>
        )}
      </section>

      {/* Content */}
      {payload && (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-6">
          {/* HERO CARD */}
          <Card className="rounded-3xl border bg-primary/5">
            <CardContent className="py-4 px-5 md:px-6 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-4 md:gap-6">
                {/* Avatar */}
                {avatar?.imageUrl ? (
                  <img
                    src={avatar.imageUrl}
                    alt={avatar.name || "Avatar"}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border bg-background"
                  />
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted flex items-center justify-center border">
                    <UserIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-lg md:text-xl">
                      {xpoll?.username || "Unknown User"}
                    </span>
                    {location?.country?.name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-background border text-muted-foreground">
                        {location.country.name}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs md:text-sm text-muted-foreground">
                    <span>
                      Level{" "}
                      <span className="font-semibold">
                        {payload.profile?.level ?? "—"}
                      </span>
                    </span>
                    <span>
                      Civic Score{" "}
                      <span className="font-semibold">
                        {payload.profile?.civicScore ?? "—"}
                      </span>
                    </span>
                    <span>
                      Highest Level{" "}
                      <span className="font-semibold">
                        {payload.highestLevel}
                      </span>
                    </span>
                  </div>

                  {payload.hasEmail && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mt-1">
                      <Mail className="w-3 h-3" />
                      <span className="break-all">
                        {payload.googleEmail || "Email connected"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Providers / quick chips */}
              <div className="flex flex-col items-start md:items-end gap-2 text-xs md:text-sm">
                <div className="flex flex-wrap gap-2 justify-end">
                  <span className="px-2 py-0.5 rounded-full border bg-background text-muted-foreground">
                    Providers: {payload.providerCount}
                  </span>
                  <span className="px-2 py-0.5 rounded-full border bg-background text-muted-foreground">
                    Email: {payload.hasEmail ? "Yes" : "No"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full border bg-background text-muted-foreground">
                    GRWB: {payload.linkedGrwbAccount ? "Linked" : "Not linked"}
                  </span>
                </div>

                {hasAnyTwitter && (
                  <div className="text-right text-xs text-muted-foreground mt-1">
                    <div>
                      <span className="font-medium">Twitter:</span>{" "}
                      {payload.twitterUsername || "—"}
                    </div>
                    {payload.twitterName && <div>{payload.twitterName}</div>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* GRID SECTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Identity / Account */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">
                  Account & Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs md:text-sm space-y-2">
                <p>
                  <span className="font-medium">Has Email:</span>{" "}
                  {payload.hasEmail ? "Yes" : "No"}
                </p>
                <p className="break-all">
                  <span className="font-medium">Google Email:</span>{" "}
                  {payload.googleEmail || "—"}
                </p>
                <p className="break-all">
                  <span className="font-medium">Twitter Username:</span>{" "}
                  {payload.twitterUsername || "—"}
                </p>
                <p>
                  <span className="font-medium">Twitter Name:</span>{" "}
                  {payload.twitterName || "—"}
                </p>
                <p>
                  <span className="font-medium">Connected Providers:</span>{" "}
                  {payload.connectedProviders?.length
                    ? payload.connectedProviders.join(", ")
                    : "None"}
                </p>
              </CardContent>
            </Card>

            {/* XPOLL Flags / Profile details */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">
                  XPOLL Profile & Flags
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs md:text-sm space-y-2">
                <p className="capitalize">
                  <span className="font-medium">Gender:</span>{" "}
                  {xpoll?.gender || "—"}
                </p>
                <p>
                  <span className="font-medium">DOB:</span>{" "}
                  {xpoll?.dob ? utcToAdminFormatted(xpoll.dob) : "—"}
                </p>

                <div className="pt-1 space-y-1">
                  <p className="font-medium text-[11px] text-muted-foreground">
                    XPOLL Flags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full border bg-background text-[11px]">
                      Disclaimer:{" "}
                      {xpoll?.meta?.isDisclaimerAccepted ? "Yes" : "No"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full border bg-background text-[11px]">
                      Preferences:{" "}
                      {xpoll?.meta?.isPreferenceSubmitted ? "Yes" : "No"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full border bg-background text-[11px]">
                      Certificate:{" "}
                      {xpoll?.meta?.isCertificateGiven ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent className="text-xs md:text-sm space-y-2">
                <p>
                  <span className="font-medium">Country:</span>{" "}
                  {location?.country?.name || "—"}
                </p>
                <p>
                  <span className="font-medium">State:</span>{" "}
                  {location?.state?.name || "—"}
                </p>
                <p>
                  <span className="font-medium">City:</span>{" "}
                  {location?.city?.name || "—"}
                </p>
              </CardContent>
            </Card>

            {/* GRWB Link */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">
                  GRWB Link
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs md:text-sm space-y-2">
                {payload.linkedGrwbAccount ? (
                  <>
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {payload.linkedGrwbAccount.name || "—"}
                    </p>
                    <p className="break-all">
                      <span className="font-medium">Email:</span>{" "}
                      {payload.linkedGrwbAccount.email || "—"}
                    </p>
                    <p>
                      <span className="font-medium">Level:</span>{" "}
                      {payload.linkedGrwbAccount.level ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium">Highest Level:</span>{" "}
                      {payload.highestLevel}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs md:text-sm">
                    No linked GRWB account.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Assets */}
            <Card className="rounded-3xl lg:col-span-2 xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Assets</CardTitle>
              </CardHeader>
              <CardContent className="text-xs md:text-sm space-y-2">
                {assets.length === 0 && (
                  <p className="text-muted-foreground text-xs md:text-sm">
                    No asset mappings found.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {assets.map((am) => (
                    <div
                      key={am.assetType}
                      className="flex items-center justify-between border rounded-xl px-3 py-2 bg-background"
                    >
                      <span className="font-medium">{am.assetType}</span>
                      <span>{am.amount}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Referral Performance (Sharer Analytics) */}
          <Card className="rounded-3xl lg:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                Referral Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs md:text-sm space-y-2">
              {isLoadingSharer && (
                <p className="text-muted-foreground">
                  Loading referral performance…
                </p>
              )}

              {sharerError && !isLoadingSharer && (
                <p className="text-red-500">
                  Failed to load referral performance.
                </p>
              )}

              {!isLoadingSharer && !sharerError && !sharerAnalytics && (
                <p className="text-muted-foreground">
                  No referral performance data for this user.
                </p>
              )}

              {sharerAnalytics && (
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 rounded-full border bg-background text-[11px] md:text-xs">
                    Links with traffic:{" "}
                    <span className="font-semibold">
                      {sharerAnalytics.linksWithTraffic}
                    </span>
                  </span>
                  <span className="px-3 py-1 rounded-full border bg-background text-[11px] md:text-xs">
                    Total views:{" "}
                    <span className="font-semibold">
                      {sharerAnalytics.totals.views}
                    </span>
                  </span>
                  <span className="px-3 py-1 rounded-full border bg-background text-[11px] md:text-xs">
                    Total uniques:{" "}
                    <span className="font-semibold">
                      {sharerAnalytics.totals.uniques}
                    </span>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserDetailsPage;
