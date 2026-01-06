import { Suspense } from "react";
import RegisterSensorForm from "@/components/register/RegisterSensorForm";
import RoleGuard from "@/components/auth/RoleGuard";

export default function RegisterPage() {
  return (
    <div className="max-w-full mx-auto space-y-4 px-8 pt-4 bg-[#030616]">
      <RoleGuard allowedRoles={["admin", "editor"]} mode="redirect" redirectPath="/">
        <Suspense fallback={<div className="text-white">Loading form...</div>}>
          <RegisterSensorForm />
        </Suspense>
      </RoleGuard>
    </div>
  );
}
