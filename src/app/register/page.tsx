import { Suspense } from "react";
import RegisterSensorForm from "@/components/register/RegisterSensorForm";

export default function RegisterPage() {
  return (
    <div className="max-w-full mx-auto space-y-4 px-8 pt-4 bg-[#030616]">
      <Suspense fallback={<div className="text-white">Loading form...</div>}>
        <RegisterSensorForm />
      </Suspense>
    </div>
  );
}
