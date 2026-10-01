import type { Metadata } from "next";
import { Suspense } from "react";
import WorkIndex, { WorkIndexWithParams } from "@/components/WorkIndex";

export const metadata: Metadata = {
  title: "Work — Orbe",
  description: "Selected projects from a fictional studio, built with placeholder content.",
};

// The unfiltered index is prerendered as the fallback; ?filter= is read on the client.
export default function WorkPage() {
  return (
    <Suspense fallback={<WorkIndex filter={null} />}>
      <WorkIndexWithParams />
    </Suspense>
  );
}
