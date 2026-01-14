"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SensorFormContent } from "./SensorFormContent";
import { useRegisterSensorForm } from "./RegisterSensorForm/hooks/useRegisterSensorForm";
import { SensorFormTabs } from "./RegisterSensorForm/components/SensorFormTabs";
import { SubmissionDialogs } from "./RegisterSensorForm/components/SubmissionDialogs";

export default function RegisterSensorForm() {
  const {
    form,
    activeTab,
    setActiveTab,
    isSubmitting,
    imagePreviews,
    areaSuggestions,
    machineNameSuggestions,
    showCropper,
    setShowCropper,
    cropImageSrc,
    setCropImageSrc,
    setCropIndex,
    isConfirmOpen,
    setIsConfirmOpen,
    pendingValues,
    isEditMode,
    editId,
    handleImageChange,
    handleCropComplete,
    handleNext,
    handleBack,
    handleReset,
    onSubmit,
    handleRealSubmit,
  } = useRegisterSensorForm();

  const tabContent = [
    { value: "master", label: "Master", index: 0 },
    { value: "sat1", label: "Satellite 1", index: 1 },
    { value: "sat2", label: "Satellite 2", index: 2 },
    { value: "sat3", label: "Satellite 3", index: 3 },
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-col min-h-screen">
        <h1 className="mb-6 text-4xl font-extrabold text-white">
          {editId || isEditMode
            ? `Edit Sensor: ${form.getValues("sensors.0.serialNumber")}`
            : "Register New Device"}
        </h1>

        <Card className="flex-1 flex flex-col border-[1px] border-[#4B5563] bg-[#111827] text-white">
          <CardHeader className="p-0">
            <SensorFormTabs editId={editId} form={form} />
          </CardHeader>

          <CardContent className="pt-6">
            <div className="mb-6 space-y-1">
              <h2 className="text-3xl font-semibold text-white">
                {isEditMode || editId ? "Edit" : "Register New"}{" "}
                {tabContent.find((t) => t.value === activeTab)?.label} Sensor
              </h2>
              <p className="text-lg text-muted-foreground">
                {isEditMode || editId
                  ? "Update sensor configuration."
                  : "Add new sensors to the monitoring system."}
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {tabContent.map((tab) => (
                  <TabsContent
                    key={tab.value}
                    value={tab.value}
                    className="mt-0"
                  >
                    <SensorFormContent
                      form={form}
                      index={tab.index}
                      areaSuggestions={areaSuggestions}
                      machineNameSuggestions={machineNameSuggestions}
                      imagePreview={imagePreviews[tab.index]}
                      onImageChange={(e) => handleImageChange(tab.index, e)}
                    />
                  </TabsContent>
                ))}

                <FormActions
                  editId={editId}
                  isSubmitting={isSubmitting}
                  isEditMode={!!editId || isEditMode}
                  activeTab={activeTab}
                  onReset={handleReset}
                  onBack={handleBack}
                  onNext={handleNext}
                />
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <SubmissionDialogs
        showCropper={showCropper}
        setShowCropper={setShowCropper}
        cropImageSrc={cropImageSrc}
        setCropImageSrc={setCropImageSrc}
        setCropIndex={setCropIndex}
        handleCropComplete={handleCropComplete}
        isConfirmOpen={isConfirmOpen}
        setIsConfirmOpen={setIsConfirmOpen}
        editId={editId}
        pendingValues={pendingValues}
        handleRealSubmit={handleRealSubmit}
      />
    </Tabs>
  );
}

interface FormActionsProps {
  editId: string | null;
  isSubmitting: boolean;
  isEditMode: boolean;
  activeTab: string;
  onReset: () => void;
  onBack: () => void;
  onNext: () => void;
}

function FormActions({
  editId,
  isSubmitting,
  isEditMode,
  activeTab,
  onReset,
  onBack,
  onNext,
}: FormActionsProps) {
  return (
    <div className="grid grid-cols-3 items-center pt-4 w-full">
      <div className="justify-self-start">
        {!editId && (
          <Button
            type="button"
            onClick={onReset}
            className="bg-[#E35D5D] text-white hover:bg-red-600 w-32 h-12 text-xl font-bold"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="justify-self-center flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="bg-[#FFFEFF] text-black hover:bg-gray-100 w-32 h-12 text-xl font-bold"
        >
          {editId || activeTab === "master" ? "Cancel" : "Back"}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#2186F3] text-white hover:bg-blue-600 w-32 h-12 text-xl font-bold"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? "Update" : "Save"}
        </Button>
      </div>

      <div className="justify-self-end">
        {!editId && activeTab !== "sat3" && (
          <Button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className="bg-[#2186F3] text-white hover:bg-blue-600 w-32 h-12 text-xl font-bold"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
