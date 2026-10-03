import VerifyOtp from "@/src/components/VerifyOtp";
import Loading from "@/src/components/Loading";
import {Suspense} from 'react'

export default function VerifyPage() {
  return (
    <Suspense fallback={<Loading/>}>
      <VerifyOtp/>
    </Suspense>
  );
}
