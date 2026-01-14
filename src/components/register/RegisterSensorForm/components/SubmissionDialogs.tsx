import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { FormValues } from "../schema";

interface SubmissionDialogsProps {
    showCropper: boolean;
    setShowCropper: (show: boolean) => void;
    cropImageSrc: string | null;
    setCropImageSrc: (src: string | null) => void;
    setCropIndex: (index: number | null) => void;
    handleCropComplete: (blob: Blob) => void;
    isConfirmOpen: boolean;
    setIsConfirmOpen: (open: boolean) => void;
    editId: string | null;
    pendingValues: FormValues | null;
    handleRealSubmit: (values: FormValues) => void;
}

export function SubmissionDialogs({
    showCropper,
    setShowCropper,
    cropImageSrc,
    setCropImageSrc,
    setCropIndex,
    handleCropComplete,
    isConfirmOpen,
    setIsConfirmOpen,
    editId,
    pendingValues,
    handleRealSubmit,
}: SubmissionDialogsProps) {
    return (
        <>
            <ImageCropper
                isOpen={showCropper}
                imageSrc={cropImageSrc}
                onClose={() => {
                    setShowCropper(false);
                    setCropImageSrc(null);
                    setCropIndex(null);
                }}
                onCropComplete={handleCropComplete}
            />
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent className="bg-[#0B1121] border-[1.35px] border-[#374151] text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl">
                            Confirm {editId ? "Update" : "Registration"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to {editId ? "update" : "register"} these
                            sensors? This action will save the configuration to the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-[1.35px] border-[#374151] text-white hover:bg-[#374151]/50">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-[#2186F3] text-white hover:bg-blue-600"
                            onClick={() => {
                                if (pendingValues) handleRealSubmit(pendingValues);
                            }}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
