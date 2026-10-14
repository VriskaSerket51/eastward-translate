"use client";
import { Suspense } from "react";
import View from "@/views/profile";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <View />
    </Suspense>
  );
}
