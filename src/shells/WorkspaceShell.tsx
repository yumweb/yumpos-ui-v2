import { Outlet } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

/** Desktop/tablet staff workspace: top nav + centered canvas (V3 Bento IA). */
export function WorkspaceShell() {
  return (
    <div className="min-h-dvh bg-bg">
      <TopNav />
      <SubscriptionBanner />
      <main className="mx-auto max-w-[1300px] px-6 pb-14 pt-7">
        <Outlet />
      </main>
      <AnnouncementModal />
    </div>
  );
}
