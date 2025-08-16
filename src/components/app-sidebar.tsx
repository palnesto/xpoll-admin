import * as React from "react";
import {
  BookCopy,
  Frame,
  GalleryVerticalEnd,
  GraduationCap,
  House,
  Images,
  LampDesk,
  Map,
  PieChart,
  ReceiptText,
  School,
  Settings,
  Trophy,
  UserPen,
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

// This is sample data.

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const data = {
    user: {
      name: "Admin",
      email: "admin@airforce.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "Airforce School Bangalore",
        logo: GalleryVerticalEnd,
        plan: "Admin",
      },
    ],
    navMain: [
      {
        title: "School Settings",
        url: "#",
        icon: Settings,
        isActive: true,
        items: [
          {
            title: "Navbar Footer",
            url: "/nav-footer",
          },
        ],
      },
      {
        title: "Home Page",
        url: "#",
        icon: House,
        isActive: true,
        items: [
          {
            title: "General Settings",
            url: "/home-page",
          },
          {
            title: "Events",
            url: "/events",
          },
          {
            title: "Toppers",
            url: "/toppers",
          },
          {
            title: "Notifications",
            url: "/notification",
          },
          {
            title: "Latest Updates",
            url: "/latest_updates",
          },
        ],
      },
      {
        title: "About Page",
        url: "#",
        icon: ReceiptText,
        isActive: true,
        items: [
          {
            title: "General Settings",
            url: "/about-page",
          },
          {
            title: "Management",
            url: "/table_management",
          },
          {
            title: "Staff GV Teaching",
            url: "/table_staff_gv_teaching",
          },
          {
            title: "Staff AV Teaching",
            url: "/table_staff_av_teaching",
          },
          {
            title: "Staff GV Non Teaching",
            url: "/table_staff_gv_non_teaching",
          },
          {
            title: "Staff AV Non Teaching",
            url: "/table_staff_av_non_teaching",
          },
          {
            title: "Student Council GV",
            url: "/table_student_council_gv",
          },
          {
            title: "Student Council AV",
            url: "/table_student_council_av",
          },
        ],
      },
      {
        title: "Academics Page",
        url: "#",
        icon: GraduationCap,
        isActive: true,
        items: [
          {
            title: "General Settings",
            url: "/academics-page",
          },
          {
            title: "Homework",
            url: "/table_homework",
          },
          {
            title: "Table Curriculum",
            url: "/table_curriculum",
          },
          {
            title: "Table Timings",
            url: "/table_timings",
          },
          {
            title: "Table Exam Timetable",
            url: "/table_exam_timetable",
          },
          {
            title: "Time Table",
            url: "/time_table",
          },
        ],
      },
      {
        title: "Facilities Page",
        url: "#",
        icon: LampDesk,
        isActive: true,
        items: [
          {
            title: "Facilities",
            url: "/facilities",
          },
        ],
      },
      {
        title: "Gallery Page",
        url: "#",
        icon: Images,
        isActive: true,
        items: [
          {
            title: "Gallery",
            url: "/gallery",
          },
        ],
      },
      {
        title: "CBSE Page",
        url: "#",
        icon: School,
        isActive: true,
        items: [
          {
            title: "General Settings",
            url: "/cbse-page",
          },
          {
            title: "Table Circulars",
            url: "/table_circular",
          },
          {
            title: "Raj Bhasha",
            url: "/raj-bhasha",
          },
        ],
      },
      {
        title: "Admissions Page",
        url: "#",
        icon: UserPen,
        isActive: true,
        items: [
          {
            title: "General Settings",
            url: "/admissions-page",
          },
        ],
      },
      {
        title: "Achievements Page",
        url: "#",
        icon: Trophy,
        isActive: true,
        items: [
          {
            title: "General Settings",
            url: "/achievements-page",
          },
          {
            title: "Table Achievements",
            url: "/table-achievements",
          },
        ],
      },
      {
        title: "Miscellaneous Page",
        url: "#",
        icon: BookCopy,
        isActive: true,
        items: [
          {
            title: "General Settings",
            url: "/miscellaneous-page",
          },
          {
            title: "Blogs",
            url: "/blogs",
          },
          {
            title: "Table Careers",
            url: "/table_careers",
          },
          {
            title: "Alumni",
            url: "/alumni",
          },
          {
            title: "Table TC Issued",
            url: "/table_tc_issued",
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
