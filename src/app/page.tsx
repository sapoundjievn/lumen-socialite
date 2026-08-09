import Sidebar from "@/components/Sidebar";
import Feed from "@/components/Feed";
import RightSidebar from "@/components/RightSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] items-start justify-center">
      {/* Left sidebar – hidden on mobile */}
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      {/* Main feed – full width on mobile, with bottom padding for nav */}
      <div className="w-full max-w-[600px] pb-28 sm:pb-0">
        <Feed />
      </div>

      {/* Right sidebar – only large screens */}
      <RightSidebar />

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
