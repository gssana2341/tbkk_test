import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import UserSettings from "@/components/settings/UserSettings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Settings</h1>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-1 bg-[#1F2937] border border-[#374151] text-white">
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Suspense fallback={<LoadingSkeleton />}>
            <UserSettings />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
