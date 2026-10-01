import type { Metadata } from "next";
import { Suspense } from "react";
import WorkIndex, { WorkIndexWithParams } from "@/components/WorkIndex";
import { person } from "@/lib/content";

export const metadata: Metadata = {
  title: `Work — ${person.name}`,
  description: `Projects by ${person.name}, ${person.role}.`,
};

// The unfiltered index is prerendered as the fallback; ?filter= is read on the client.
export default function WorkPage() {
  return (
    <Suspense fallback={<WorkIndex filter={null} />}>
      <WorkIndexWithParams />
    </Suspense>
  );
}
