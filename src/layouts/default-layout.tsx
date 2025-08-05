import { ReactNode } from "react";

// responsibility: To provide a default layout for the app
export default function DefaultLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-0">{children}</div>
    </div>
  );
}
