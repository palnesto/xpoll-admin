import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import DotGrid from "@/components/DotGrid";
import { cn } from "@/lib/utils";

// responsibility: To provide a default layout for the app
export default function DefaultLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="rounded-r-lg p-3 bg-sidebar">
            <div className="relative rounded-lg min-h-[97.7dvh] max-h-[97.7dvh] overflow-hidden bg-black">
              <div
                className={cn(
                  "absolute h-full w-full translate-y-[50%] scale-[2]",
                  "bg-purple-radial"
                )}
              ></div>
              <div className="absolute inset-0 z-0">
                <DotGrid
                  dotSize={3}
                  gap={30}
                  baseColor="#18181B"
                  activeColor="#18181B"
                  proximity={0}
                  shockRadius={0}
                  shockStrength={0}
                  resistance={750}
                  returnDuration={1.5}
                />
              </div>

              <div className="min-h-[97.7dvh] max-h-[97.7dvh] overflow-y-auto relative px-16 py-8">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
