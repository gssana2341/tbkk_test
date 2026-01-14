"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
} from "@/api/users/users";
import { compressImage } from "@/lib/utils/imageUtils";
import { useAuth } from "@/components/auth/AuthProvider";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function UserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(
    null
  );
  const [error, setError] = useState<string>("");

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    title: "",
    description: "",
    onConfirm: () => { },
  });

  const triggerConfirm = (
    title: string,
    description: string,
    onConfirm: () => void
  ) => {
    setConfirmConfig({ title, description, onConfirm });
    setConfirmOpen(true);
  };

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getUserProfile();
      const userData = response.user;

      setName(userData.name || "");
      setEmail(userData.email || "");
      setAvatarUrl(userData.avatar_url || "");
      setJobTitle(userData.job_title || "");
      setDepartment(userData.department || "");
      setPhoneNumber(userData.phone_number || "");
      setBio(userData.bio || "");
      setBio(userData.bio || "");
    } catch {
      setError("Failed to load user profile. Please refresh the page.");
      // Use current user data as fallback
      if (user) {
        setName(user.name || "");
        setEmail(user.email || "");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    triggerConfirm(
      "Update Profile",
      "Are you sure you want to update your profile information?",
      async () => {
        try {
          setSaving(true);
          setSaveStatus(null);
          setError("");

          await updateUserProfile({
            name,
            avatar_url: avatarUrl,
            job_title: jobTitle,
            department,
            phone_number: phoneNumber,
            bio,
          });

          setSaveStatus("success");
          toast({
            title: "Profile Updated",
            description: "Your profile has been updated successfully.",
          });

          setTimeout(() => {
            setSaveStatus(null);
          }, 3000);
        } catch (err) {
          console.error("Error saving profile:", err);
          setSaveStatus("error");
          const errorMessage =
            err && typeof err === "object" && "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message
              : err && typeof err === "object" && "message" in err
                ? (err as { message?: string }).message
                : undefined;
          const finalErrorMessage =
            errorMessage || "Failed to update profile. Please try again.";
          setError(finalErrorMessage);
          toast({
            title: "Update Failed",
            description: finalErrorMessage,
            variant: "destructive",
          });
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Compress image before upload
      console.log("Original file size:", (file.size / 1024).toFixed(2), "KB");
      const compressedFile = await compressImage(file, 800, 800, 0.8);
      console.log(
        "Compressed file size:",
        (compressedFile.size / 1024).toFixed(2),
        "KB"
      );

      // Upload the file to the server using the Base64 logic (same as registration)
      const response = await uploadAvatar(compressedFile);

      if (response.avatar_url) {
        setAvatarUrl(response.avatar_url);
        toast({
          title: "Avatar Updated",
          description: "Your profile picture has been updated successfully.",
        });
      }
    } catch (err) {
      console.error("Error updating avatar:", err);
      toast({
        title: "Update Failed",
        description: "Failed to upload avatar to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 mt-6">
      {saveStatus === "success" && (
        <Alert className="mb-4">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">
            Profile updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {saveStatus === "error" && error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Manage your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex flex-col items-center space-y-2">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={avatarUrl || "/abstract-geometric-shapes.png"}
                  alt="User"
                />
                <AvatarFallback>{getInitials(name || "User")}</AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="bg-[#030616] border-[1.35px] border-[#374151] text-white hover:bg-[#374151]/50 hover:text-white"
                >
                  <span>Change Avatar</span>
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={saving}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-[#030616] border-[1.35px] border-[#374151] text-white cursor-not-allowed opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-title">Job Title</Label>
                <Input
                  id="job-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={saving}
                  className="bg-[#11171F] border-[#4B5563] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={saving}
                  className="bg-[#11171F] border-[#4B5563] text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={saving}
                  className="bg-[#11171F] border-[#4B5563] text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={saving}
                  placeholder="Tell us about yourself"
                  className="bg-[#11171F] border-[#4B5563] text-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveProfile} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Profile"
          )}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
      />
    </div >
  );
}
