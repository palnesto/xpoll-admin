import * as React from "react";
import {
  Brain,
  Frame,
  GraduationCap,
  Map,
  PieChart,
  ReceiptText,
  Settings,
} from "lucide-react";
import xOctopus from "@/assets/sidebar.png";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import xpollSVG from "@/assets/xpoll-svg.svg";
import { useLocation } from "react-router";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation();
  console.log("pathname", pathname);

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
    isLLMQueries,
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

    // llm
    const isLLMQueries = (() => {
      if (pathname.startsWith("/llm/queries")) return true;
      return false;
    })();
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
      isLLMQueries,
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
        isActive: isOverallPollStats,
        items: [
          {
            title: "Overall Poll Stats",
            url: "/",
            isActive: isOverallPollStats,
          },
        ],
      },
      {
        title: "All Polls",
        url: "#",
        icon: ReceiptText,
        isActive: isAdminAndUserPolls || isTrialPolls,
        items: [
          {
            title: "Admin and Users Polls",
            url: "/polls",
            isActive: isAdminAndUserPolls,
          },
          {
            title: "Trial Polls",
            url: "/trials",
            isActive: isTrialPolls,
          },
        ],
      },
      {
        title: "Actions",
        url: "#",
        icon: Settings,
        isActive: isAllActions,
        items: [
          {
            title: "All Actions",
            url: "/actions",
            isActive: isAllActions,
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
          isSellIntent ||
          isSellIntentAdmin ||
          isSellIntentPending ||
          isSellIntentApproval ||
          isSellIntentRejection,
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
            title: "Sell Intent All",
            url: "/asset-ledger/sell-intent",
            isActive: isSellIntent,
          },
          {
            title: "Sell Intent Pending",
            url: "/asset-ledger/sell-intent-pending",
            isActive: isSellIntentPending,
          },
          {
            title: "Sell Intent Approval",
            url: "/asset-ledger/sell-intent-approval",
            isActive: isSellIntentApproval,
          },
          {
            title: "Sell Intent Rejection",
            url: "/asset-ledger/sell-intent-rejection",
            isActive: isSellIntentRejection,
          },
        ],
      },
      {
        title: "Analytics",
        url: "#",
        icon: Settings,
        isActive: isAnalyticsPoll,
        items: [
          {
            title: "Polls",
            url: "/analytics/polls",
            isActive: isAnalyticsPoll,
          },
        ],
      },
      {
        title: "LLM",
        url: "#",
        icon: Settings,
        isActive: isLLMQueries,
        items: [
          {
            title: "Queries",
            url: "/llm/queries",
            isActive: isLLMQueries,
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
          {/* <span className="text-3xl font-semibold">Xpoll</span> */}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      {/* <SidebarRail /> */}
    </Sidebar>
  );
}
