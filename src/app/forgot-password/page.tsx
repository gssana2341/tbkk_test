"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showNewPasswordEye, setShowNewPasswordEye] = useState(false);
  const [showConfirmPasswordEye, setShowConfirmPasswordEye] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email");
      setIsSubmitting(false);
      return;
    }

    // TODO: Call API to send password reset email here
    setTimeout(() => {
      setSuccess("");
      setIsSubmitting(false);
      setShowOtp(true);
    }, 1200);
  };

  const handleOtpChange = (idx: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    if (value && idx < 3) {
      otpRefs[idx + 1].current?.focus();
    }
    if (!value && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const handleResend = () => {
    setError("");
    setSuccess("");
    setOtp(["", "", "", ""]);
    // TODO: Call API to resend code
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.some((digit) => digit === "")) {
      setError("Please enter all 4 digits");
      return;
    }
    setError("");
    setSuccess("OTP verified!");
    setShowNewPassword(true);
    // TODO: Call API to verify OTP
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in both fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    // TODO: Call API to set new password
    setPasswordError("");
    setSuccess("Password changed successfully!");
    setTimeout(() => {
      router.push("/login");
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-8">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        {!showNewPassword ? (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-white">
                {showOtp ? "Verify Your Email" : "Forgot Password"}
              </CardTitle>
              {showOtp ? (
                <CardDescription className="text-center text-gray-400 text-xs">
                  Please Enter The 4 Digit Code Sent To
                  <br />
                  <span className="text-gray-300 text-xs">{email}</span>
                </CardDescription>
              ) : (
                <CardDescription className="text-center text-gray-400 text-xs">
                  Please Enter Your Email Address To Receive a Verification Code
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!showOtp ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert
                      variant="destructive"
                      className="bg-red-900 border-red-700"
                    >
                      <AlertDescription className="text-red-100">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert className="bg-green-900 border-green-700">
                      <AlertDescription className="text-green-100">
                        {success}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  {error && (
                    <Alert
                      variant="destructive"
                      className="bg-red-900 border-red-700"
                    >
                      <AlertDescription className="text-red-100">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert className="bg-green-900 border-green-700">
                      <AlertDescription className="text-green-100">
                        {success}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-center gap-4 my-4">
                    {otp.map((digit, idx) => (
                      <Input
                        key={idx}
                        ref={otpRefs[idx]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        className="w-14 h-14 text-center text-2xl bg-gray-900 border-gray-400 focus:border-blue-500"
                      />
                    ))}
                  </div>
                  <div className="text-center mb-2">
                    <button
                      type="button"
                      className="text-blue-500 underline text-sm"
                      onClick={handleResend}
                    >
                      Resend Code
                    </button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                  >
                    OK
                  </Button>
                </form>
              )}
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-black">
                Create New Password
              </CardTitle>
              <CardDescription className="text-center text-gray-400 text-base">
                Your New Password Must Be Different from Previously Used
                Password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {passwordError && (
                  <Alert
                    variant="destructive"
                    className="bg-red-900 border-red-700"
                  >
                    <AlertDescription className="text-red-100">
                      {passwordError}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-black">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPasswordEye ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-white border-gray-400 text-black pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowNewPasswordEye((v) => !v)}
                      tabIndex={-1}
                    >
                      {showNewPasswordEye ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-black">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPasswordEye ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white border-gray-400 text-black pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowConfirmPasswordEye((v) => !v)}
                      tabIndex={-1}
                    >
                      {showConfirmPasswordEye ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gray-300 text-black font-bold hover:bg-gray-400"
                >
                  Confirm
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
