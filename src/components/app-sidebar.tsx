import {
  Brain,
  Frame,
  GraduationCap,
  Map,
  PieChart,
  ReceiptText,
  User,
  Combine,
  Megaphone,
  LayoutTemplate,
} from "lucide-react";
import xOctopus from "@/assets/sidebar.png";
import inkd from "@/assets/inkd.png";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import xpollSVG from "@/assets/xpoll-svg.svg";
import { useLocation, useNavigate } from "react-router";
import { ComponentProps, useMemo, useRef, useState } from "react";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [showInkVideo, setShowInkVideo] = useState(false);
  const hasNavigatedRef = useRef(false);

  const {
    isOverallPollStats,
    isAllLedgers,
    isSystemReport,
    isSellIntent,
    isSellIntentAdmin,
    isSellIntentPending,
    isSellIntentApproval,
    isSellIntentRejection,
    isAnalyticsPoll,
    isAnalyticsTrials,
    isLLMQueries,
    isAllBlogs,
    isAllCampaigns,
    isCreateCampaign,
    isUsers,
    isReferralConfig,
    isAllPayments,
    isAllOfflinePayments,
    isAd,
    isAdOwners,
    isIndustry,
    isAds,
    isBuyConfigManagement,
  } = useMemo(() => {
    // isOverallPollStats
    const isOverallPollStats = pathname === "/";
    // all ledgers
    const isAllLedgers = pathname === "/asset-ledger/all-ledger";
    const isSystemReport = pathname === "/asset-ledger/system-report";
    const isSellIntent = pathname === "/asset-ledger/sell-intent";
    const isSellIntentAdmin = pathname === "/asset-ledger/sell-intent-admin";
    const isSellIntentPending =
      pathname === "/asset-ledger/sell-intent-pending";
    const isSellIntentApproval =
      pathname === "/asset-ledger/sell-intent-approval";
    const isSellIntentRejection =
      pathname === "/asset-ledger/sell-intent-rejection";
    // analytics poll
    const isAnalyticsPoll = (() => {
      if (pathname.startsWith("/analytics/polls")) return true;
      return false;
    })();
    // analytics trials
    const isAnalyticsTrials = (() => {
      if (pathname.startsWith("/analytics/trials")) return true;
      return false;
    })();

    // LLM
    const isLLMQueries = pathname.startsWith("/llm/queries");

    // All Blogs
    const isAllBlogs = pathname === "/blogs/all-blogs";

    const isAllCampaigns = pathname === "/campaign";
    const isCreateCampaign = pathname === "/campaign/create";

    // Users management
    const isUsers = pathname === "/users";
    const isReferralConfig = pathname === "/referral-config";
    const isAllPayments = pathname === "/asset-ledger/all-payments";
    const isAllOfflinePayments =
      pathname === "/asset-ledger/all-offline-payments";
    const isBuyConfigManagement = pathname.startsWith("/buy-config-management");

    // Ads management
    const isAdOwners = pathname.startsWith("/ad/ad-owners");
    const isIndustry = pathname.startsWith("/industry");
    const isAds = pathname.startsWith("/ad/ads");
    const isAd = pathname.startsWith("/ad") || isIndustry || isAds;

    return {
      isOverallPollStats,
      isAllLedgers,
      isSystemReport,
      isSellIntent,
      isSellIntentAdmin,
      isSellIntentPending,
      isSellIntentApproval,
      isSellIntentRejection,
      isAnalyticsPoll,
      isAnalyticsTrials,
      isLLMQueries,
      isUsers,
      isReferralConfig,
      isAllBlogs,
      isAllPayments,
      isAllOfflinePayments,
      isAllCampaigns,
      isCreateCampaign,
      isAd,
      isAdOwners,
      isIndustry,
      isAds,
      isBuyConfigManagement,
    };
  }, [pathname]);

  const handleInkClick = () => {
    hasNavigatedRef.current = false;
    setShowInkVideo(true);
  };

  const handleInkVideoTimeUpdate = (
    e: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    const video = e.currentTarget;

    if (
      !hasNavigatedRef.current &&
      video.duration &&
      video.currentTime >= video.duration - 0.15
    ) {
      hasNavigatedRef.current = true;
      navigate("/inkd");
    }
  };

  const handleInkVideoEnd = () => {
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      navigate("/inkd");
    }
  };

  const data = {
    user: {
      name: "Admin",
      email: "xpoll",
      avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
      {
        title: "XP Intelligence",
        url: "#",
        icon: Brain,
        isActive:
          isOverallPollStats ||
          isAnalyticsPoll ||
          isAnalyticsTrials ||
          isLLMQueries,
        items: [
          {
            title: "Overall Poll Stats",
            url: "/",
            isActive: isOverallPollStats,
          },
          {
            title: "Polls Analytics",
            url: "/analytics/polls",
            isActive: isAnalyticsPoll,
          },
          {
            title: "Trails Analytics",
            url: "/analytics/trials",
            isActive: isAnalyticsTrials,
          },
          {
            title: "XPOLL AI",
            url: "/llm/queries",
            isActive: isLLMQueries,
          },
        ],
      },
      {
        title: "Transfer Rewards",
        url: "#",
        icon: ReceiptText,
        isActive:
          isSellIntent ||
          isSellIntentAdmin ||
          isSellIntentPending ||
          isSellIntentApproval ||
          isSellIntentRejection,
        items: [
          {
            title: "Batch Transfer",
            url: "/asset-ledger/sell-intent",
            isActive: isSellIntent,
          },
          {
            title: "Pending Transfers",
            url: "/asset-ledger/sell-intent-pending",
            isActive: isSellIntentPending,
          },
          {
            title: "Approved Transfers",
            url: "/asset-ledger/sell-intent-approval",
            isActive: isSellIntentApproval,
          },
          {
            title: "Rejected Transfers",
            url: "/asset-ledger/sell-intent-rejection",
            isActive: isSellIntentRejection,
          },
        ],
      },
      {
        title: "Asset Ledger",
        url: "#",
        icon: GraduationCap,
        isActive:
          isAllLedgers ||
          isSystemReport ||
          isAllPayments ||
          isAllOfflinePayments ||
          isBuyConfigManagement,
        items: [
          {
            title: "All Ledgers",
            url: "/asset-ledger/all-ledger",
            isActive: isAllLedgers,
          },
          {
            title: "System Report",
            url: "/asset-ledger/system-report",
            isActive: isSystemReport,
          },
          {
            title: "Strain Coin Management",
            url: "/strain/manage",
            isActive: isSystemReport,
          },
          {
            title: "All Payments",
            url: "/asset-ledger/all-payments",
            isActive: isAllPayments,
          },
          {
            title: "All Offline Payments",
            url: "/asset-ledger/all-offline-payments",
            isActive: isAllOfflinePayments,
          },
          {
            title: "Buy Config Management",
            url: "/buy-config-management",
            isActive: isBuyConfigManagement,
          },
        ],
      },
      {
        title: "Blogs",
        url: "#",
        icon: LayoutTemplate,
        isActive: isAllBlogs,
        items: [
          {
            title: "All Blogs",
            url: "/blogs/all-blogs",
            isActive: isAllBlogs,
          },
        ],
      },
      {
        title: "Users Management",
        url: "#",
        icon: User,
        isActive: isUsers || isReferralConfig,
        items: [
          {
            title: "All Users",
            url: "/users",
            isActive: isUsers,
          },
          {
            title: "Referral Config",
            url: "/referral-config",
            isActive: isReferralConfig,
          },
        ],
      },
      {
        title: "Campaigns",
        url: "#",
        icon: Combine,
        isActive: isAllCampaigns || isCreateCampaign,
        items: [
          {
            title: "All Campaigns",
            url: "/campaign",
            isActive: isCreateCampaign,
          },
          {
            title: "Create Campaign",
            url: "/campaign/create",
            isActive: isCreateCampaign,
          },
        ],
      },
      {
        title: "Ads Management",
        url: "#",
        icon: Megaphone,
        isActive: isAd,
        items: [
          {
            title: "Ad Owners",
            url: "/ad/ad-owners",
            isActive: isAdOwners,
          },
          {
            title: "Industry",
            url: "/industry",
            isActive: isIndustry,
          },
          {
            title: "Ads",
            url: "/ad/ads",
            isActive: isAds,
          },
        ],
      },
    ],
    projects: [
      {
        name: "Design Engineering",
        url: "#",
        icon: Frame,
      },
      {
        name: "Sales & Marketing",
        url: "#",
        icon: PieChart,
      },
      {
        name: "Travel",
        url: "#",
        icon: Map,
      },
    ],
  };

  return (
    <>
      {showInkVideo && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <video
            src="https://prod-storage.xpoll.io/xpoll-blob-dump-user/ink.mp4"
            autoPlay
            muted
            playsInline
            onTimeUpdate={handleInkVideoTimeUpdate}
            onEnded={handleInkVideoEnd}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <Sidebar collapsible="icon" {...props}>
        <img
          src={xOctopus}
          alt="Octopus Tactical"
          className="pointer-events-none absolute bottom-0 left-5 z-0 h-60 xl:h-80 object-contain mix-blend-screen opacity-10"
        />
        <SidebarHeader>
          <div className="flex px-4 pt-4 py-3 gap-2 items-center">
            <div className="h-12 aspect-3/4">
              <img src={xpollSVG} className="h-full w-full object-contain" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="relative z-10">
          <NavMain items={data.navMain} />
          <figure
            className="h-12 w-fit pl-4 cursor-pointer"
            onClick={handleInkClick}
          >
            <img src={inkd} className="w-full h-full object-contain" />
          </figure>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>
    </>
  );
}