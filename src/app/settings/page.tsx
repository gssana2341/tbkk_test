import { Suspense } from "react";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import UserSettings from "@/components/settings/UserSettings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Settings</h1>

      <Suspense fallback={<LoadingSkeleton />}>
        <UserSettings />
      </Suspense>
    </div>
  );
}
