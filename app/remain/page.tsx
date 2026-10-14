"use client";
import { Suspense } from "react";
import View from "@/views/remain";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <View />
    </Suspense>
  );
}
