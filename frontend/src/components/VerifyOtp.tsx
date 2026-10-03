"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { user_service, useAppData } from "@/src/context/AppContext"; 
import Loading from "./Loading";

export default function VerifyOtp() {
  const { isAuth, setAuth: setIsAuth, setUser, loading: userLoading } = useAppData();
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") || "";
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(60);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const router = useRouter();
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (index: number, value: string): void => {
    if (value === "") {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      setError("");
      return;
    }

    const digit = value.replace(/\D/g, "").slice(0, 1);
    if (!digit) return;

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        setError("");
        return;
      }

      if (index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const digits = pasteData.replace(/\D/g, "").slice(0, 6);
    if (digits.length > 0) {
      const newOtp = Array(6)
        .fill("")
        .map((_, i) => digits[i] || "");
      setOtp(newOtp);
      const focusIndex = Math.min(digits.length - 1, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      toast.error("Email is missing");
      return;
    }

    try {
      setResendLoading(true);
      console.log("Resend OTP request started for:", email);

      const { data } = await axios.post(`${user_service}/api/v1/login`, { email });

      setOtp(Array(6).fill(""));
      setError("");
      setTimer(60);
      toast.success(data?.message || "A new OTP has been sent.");
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error
        ? err.message
        : String(err);

      toast.error(message || "Failed to resend OTP");
      console.error("Resend OTP error:", err);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length !== 6) {
      setError("Please enter the 6-digit OTP");
      toast.error("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${user_service}/api/v1/verify`,
        { email, otp: code }   
      );

      if (data?.token) {
        Cookies.set("token", data.token, {
          expires: 7,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
        setOtp(["","","","","",""])
        setUser(data.user)
        setIsAuth(true)
      }

      toast.success("User is verified");
      router.push("/chat");
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error
        ? err.message
        : String(err);
      toast.error(message || "Verification failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if(userLoading) return <Loading/>

  if (isAuth) {
    router.push("/chat");
    return null;
  }


  


  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0d1a] text-white">
      <div className="w-full max-w-md p-6 bg-[#0a0d2a] rounded-xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-300 transition hover:text-white"
          >
            <ArrowLeft className="h-8 w-8" />
           
          </button>
          <div className="w-16" />
        </div>

        <div className="mb-4 text-center">
          <h1 className="text-3xl font-semibold text-[#1b62ff]">Verify your account</h1>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          A one-time password was sent to <strong>{email}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
            Enter Your 6 digit OTP here
          </label>
          <div className="flex gap-2 justify-center mb-4">
            {otp.map((value, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                value={value}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="w-10 h-10 text-center rounded bg-[#111628] border border-slate-800 text-white"
              />
            ))}
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#1b62ff] py-2"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-400">
          <button
            onClick={handleResendOtp}
            disabled={resendLoading || timer > 0}
            className="underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendLoading ? "Sending..." : timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
          </button>
        </div>
      </div>
    </main>
  );
}
