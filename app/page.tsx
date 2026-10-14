"use client";
import { Suspense } from "react";
import View from "@/views/index";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <View />
    </Suspense>
  );
}
