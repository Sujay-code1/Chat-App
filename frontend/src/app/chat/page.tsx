"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/src/context/AppContext";
import Loading from "@/src/components/Loading";

export default function ChatApp() {
  const router = useRouter();

  const {loading, isAuth} = useAppData();

  useEffect(() => {
    if(!isAuth && !loading){
      router.push("/login");
    }
  }, [isAuth, loading, router]);

  if(loading) return <Loading/>

  return (
    <div>
      <h1>Chat Page</h1>
    </div>
  )
}
