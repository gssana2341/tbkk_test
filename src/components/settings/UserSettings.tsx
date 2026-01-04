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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  updateSecuritySettings,
  enableTwoFactor,
  uploadAvatar,
} from "@/api/users/users";
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

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Security settings state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState<string>("30");

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    title: "",
    description: "",
    onConfirm: () => {},
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
      setTwoFactorEnabled(userData.two_factor_enabled || false);
      setSessionTimeout(
        userData.session_timeout_minutes === null
          ? "never"
          : userData.session_timeout_minutes?.toString() || "30"
      );
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

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      toast({
        title: "Validation Error",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    triggerConfirm(
      "Change Password",
      "Are you sure you want to change your password? You will need to use your new password for future logins.",
      async () => {
        try {
          setSaving(true);
          setSaveStatus(null);
          setError("");

          await changePassword({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          });

          // Clear password fields
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");

          toast({
            title: "Password Changed",
            description: "Your password has been changed successfully.",
          });
        } catch (err) {
          console.error("Error changing password:", err);
          setSaveStatus("error");
          const errorMessage =
            err && typeof err === "object" && "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              : err && typeof err === "object" && "message" in err
                ? (err as { message?: string }).message
                : undefined;
          const finalErrorMessage =
            errorMessage || "Failed to change password. Please try again.";
          setError(finalErrorMessage);
          toast({
            title: "Change Password Failed",
            description: finalErrorMessage,
            variant: "destructive",
          });
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const handleToggleTwoFactor = async (enabled: boolean) => {
    const actionLabel = enabled ? "Enable" : "Disable";
    triggerConfirm(
      `${actionLabel} 2FA`,
      `Are you sure you want to ${actionLabel.toLowerCase()} Two-Factor Authentication?`,
      async () => {
        try {
          setSaving(true);
          setError("");

          if (enabled) {
            await enableTwoFactor();
            setTwoFactorEnabled(true);
            await updateSecuritySettings({ two_factor_enabled: true });
            toast({
              title: "2FA Enabled",
              description:
                "Two-factor authentication has been enabled. Please save your backup codes.",
            });
            // You can show QR code and backup codes in a dialog here
          } else {
            // For disabling, we might need password confirmation
            // For now, just update the settings
            await updateSecuritySettings({ two_factor_enabled: false });
            setTwoFactorEnabled(false);
            toast({
              title: "2FA Disabled",
              description: "Two-factor authentication has been disabled.",
            });
          }
        } catch (err) {
          console.error("Error toggling 2FA:", err);
          setTwoFactorEnabled(!enabled); // Revert on error
          const errorMessage =
            err && typeof err === "object" && "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              : err && typeof err === "object" && "message" in err
                ? (err as { message?: string }).message
                : undefined;
          const finalErrorMessage =
            errorMessage || "Failed to update 2FA settings. Please try again.";
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

  const handleSessionTimeoutChange = async (value: string) => {
    const previousValue = sessionTimeout;
    triggerConfirm(
      "Change Session Timeout",
      `Are you sure you want to change the session timeout to ${value === "never" ? "never" : value + " minutes"}?`,
      async () => {
        setSessionTimeout(value);
        try {
          const timeoutMinutes = value === "never" ? null : parseInt(value);
          await updateSecuritySettings({
            session_timeout_minutes: timeoutMinutes,
          });
          toast({
            title: "Settings Updated",
            description: "Session timeout has been updated successfully.",
          });
        } catch {
          setSessionTimeout(previousValue); // Revert on error
          toast({
            title: "Update Failed",
            description: "Failed to update session timeout. Please try again.",
            variant: "destructive",
          });
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
      // Create a local URL for the selected image (Caching locally)
      const localUrl = URL.createObjectURL(file);
      setAvatarUrl(localUrl);

      toast({
        title: "Avatar Updated (Cached)",
        description: "Your avatar has been updated locally.",
      });

      // Note: We are not calling uploadAvatar(file) as requested to save to DB
    } catch (err) {
      console.error("Error updating avatar:", err);
      toast({
        title: "Update Failed",
        description: "Failed to update avatar locally.",
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

      <Card className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={saving}
                className="bg-[#11171F] border-[#4B5563] text-white"
              />
            </div>

            <div></div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={saving}
                className="bg-[#11171F] border-[#4B5563] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={saving}
                className="bg-[#11171F] border-[#4B5563] text-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={saving || !currentPassword || !newPassword}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-500">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={handleToggleTwoFactor}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Session Timeout</h3>
                <p className="text-sm text-gray-500">
                  Automatically log out after inactivity
                </p>
              </div>
              <Select
                value={sessionTimeout}
                onValueChange={handleSessionTimeoutChange}
                disabled={saving}
              >
                <SelectTrigger className="w-[180px] bg-[#030616] border-[1.35px] border-[#374151] text-white">
                  <SelectValue placeholder="Select timeout" />
                </SelectTrigger>
                <SelectContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
