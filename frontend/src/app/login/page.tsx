"use client";

import { user_service, useAppData } from "@/src/context/AppContext";
import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Loading from "@/src/components/Loading";


export default function LoginPage() {

 const [email, setEmail] = useState<string>("");
 const [loading, setLoading] = useState<boolean>(false);
 const router = useRouter();

 const { isAuth, loading: userLoading } = useAppData();

 useEffect(() => {
   if (!userLoading && isAuth) {
     router.replace("/chat");
   }
 }, [isAuth, userLoading, router]);

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) : Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(`${user_service}/api/v1/login`, { email })

     
      console.log("login response:", data);
      toast.success(data?.message || "Verification link sent. Please check your email.")
      const target = `/verify?email=${encodeURIComponent(email)}`;
     
      console.log("navigating to:", target);
      await router.push(target);

    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error
          ? err.message
          : String(err);
     
      toast.error(message);
      
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
 }

 if (userLoading) return <Loading />;
 if (isAuth) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0d1a] px-4 text-white font-sans">
      <div className="w-full max-w-100 text-center">
        
        {/* Title & Subtitle */}
        <h1 className="text-5xl font-extralight tracking-tight text-white mb-2">
           Welcome back
        </h1>
        <p className="text-slate-400 text-sm font-normal mb-8">
          Sign in to ChatApp to continue
        </p>

        {/* Form */}
        <form className="text-left space-y-5" 
        onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-200 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-[#111628] border border-slate-800/80 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            />
          </div>

          <button
            disabled={loading}
            aria-busy={loading}
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1b62ff] hover:bg-blue-600 active:scale-[0.99] py-3 px-4 text-sm font-semibold text-white transition-all duration-150 shadow-md shadow-blue-500/20"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send verification link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

      </div>
    </main>
  );
}