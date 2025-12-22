import * as React from "react";
import {
  Brain,
  Frame,
  GraduationCap,
  Map,
  PieChart,
  ReceiptText,
  User,
  LayoutTemplate,
} from "lucide-react";
import xOctopus from "@/assets/sidebar.png";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import xpollSVG from "@/assets/xpoll-svg.svg";
import { useLocation } from "react-router";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation();
  const {
    isOverallPollStats,
    isAdminAndUserPolls,
    isTrialPolls,
    isAllActions,
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
    isUsers,
    isReferralConfig,
  } = React.useMemo(() => {
    // isOverallPollStats
    const isOverallPollStats = pathname === "/";
    // isAdminAndUserPolls
    const isAdminAndUserPolls = (() => {
      if (pathname.startsWith("/polls")) return true;
      else return false;
    })();
    // isTrialPolls
    const isTrialPolls = (() => {
      if (pathname.startsWith("/trials")) return true;
      return false;
    })();
    // isAllActions
    const isAllActions = (() => {
      if (pathname.startsWith("/actions")) return true;
      return false;
    })();
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

    // Users management
    const isUsers = pathname === "/users";
    const isReferralConfig = pathname === "/referral-config";

    return {
      isOverallPollStats,
      isAdminAndUserPolls,
      isTrialPolls,
      isAllActions,
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
    };
  }, [pathname]);

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
        isActive: isAllLedgers || isSystemReport,
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
    <Sidebar collapsible="icon" {...props}>
      <img
        src={xOctopus}
        alt="Octopus Tactical"
        className="absolute bottom-0 left-5 h-60 xl:h-80 object-contain mix-blend-screen opacity-10"
      />
      <SidebarHeader>
        <div className="flex px-4 pt-4 py-3 gap-2 items-center">
          <div className="h-12 aspect-3/4">
            <img src={xpollSVG} className="h-full w-full object-contain" />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
