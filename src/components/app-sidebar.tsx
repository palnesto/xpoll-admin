import * as React from "react";
import {
  Frame,
  GalleryVerticalEnd,
  GraduationCap,
  House,
  Map,
  PieChart,
  ReceiptText,
  Settings,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const data = {
    user: {
      name: "Admin",
      email: "admin@airforce.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "XPOLL",
        logo: GalleryVerticalEnd,
        plan: "Admin",
      },
    ],
    navMain: [
      {
        title: "Polls",
        url: "#",
        icon: Settings,
        isActive: true,
        items: [
          {
            title: "Polls",
            url: "/polls",
          },
        ],
      },
      {
        title: "Trial Polls",
        url: "#",
        icon: House,
        isActive: true,
        items: [
          {
            title: "Trial Polls",
            url: "/trials",
          },
        ],
      },
      {
        title: "Actions",
        url: "#",
        icon: ReceiptText,
        isActive: true,
        items: [
          {
            title: "All Actions",
            url: "/actions",
          },
        ],
      },
      {
        title: "Asset Ledger",
        url: "#",
        icon: GraduationCap,
        isActive: true,
        items: [
          {
            title: "All Ledgers",
            url: "/asset-ledger/all-ledger",
          },
          {
            title: "System Report",
            url: "/asset-ledger/system-report",
          },
          {
            title: "Sell Intent",
            url: "/asset-ledger/sell-intent",
          },
          {
            title: "Sell Intent Approval",
            url: "/asset-ledger/sell-intent-approval",
          },
          {
            title: "Sell Intent Rejection",
            url: "/asset-ledger/sell-intent-rejection",
          },
        ],
      },
      // {
      //   title: "Academics Page",
      //   url: "#",
      //   icon: GraduationCap,
      //   isActive: true,
      //   items: [
      //     {
      //       title: "General Settings",
      //       url: "/academics-page",
      //     },
      //   ],
      // },
      // {
      //   title: "Facilities Page",
      //   url: "#",
      //   icon: LampDesk,
      //   isActive: true,
      //   items: [
      //     {
      //       title: "Facilities",
      //       url: "/facilities",
      //     },
      //   ],
      // },
      // {
      //   title: "Gallery Page",
      //   url: "#",
      //   icon: Images,
      //   isActive: true,
      //   items: [
      //     {
      //       title: "Gallery",
      //       url: "/gallery",
      //     },
      //   ],
      // },
      // {
      //   title: "CBSE Page",
      //   url: "#",
      //   icon: School,
      //   isActive: true,
      //   items: [
      //     {
      //       title: "General Settings",
      //       url: "/cbse-page",
      //     },
      //   ],
      // },
      // {
      //   title: "Admissions Page",
      //   url: "#",
      //   icon: UserPen,
      //   isActive: true,
      //   items: [
      //     {
      //       title: "General Settings",
      //       url: "/admissions-page",
      //     },
      //   ],
      // },
      // {
      //   title: "Achievements Page",
      //   url: "#",
      //   icon: Trophy,
      //   isActive: true,
      //   items: [
      //     {
      //       title: "General Settings",
      //       url: "/achievements-page",
      //     },
      //   ],
      // },
      // {
      //   title: "Miscellaneous Page",
      //   url: "#",
      //   icon: BookCopy,
      //   isActive: true,
      //   items: [
      //     {
      //       title: "General Settings",
      //       url: "/miscellaneous-page",
      //     },
      //   ],
      // },
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
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
