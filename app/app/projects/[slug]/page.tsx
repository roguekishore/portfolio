import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CaseStudy from "@/components/case/CaseStudy";
import { allProjects, caseStudies, nextProject, projectBySlug } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

// Every case study is prerendered; unknown slugs 404 instead of rendering on demand.
export const dynamicParams = false;

export function generateStaticParams() {
  return allProjects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projectBySlug(slug);
  return project ? { title: `${project.client} — Orbe`, description: project.title } : {};
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  const data = caseStudies[slug];
  if (!project || !data) notFound();
  const next = nextProject(slug);
  return (
    <CaseStudy
      project={project}
      data={data}
      next={{ project: next, hero: caseStudies[next.slug].hero }}
      index={allProjects.indexOf(project)}
      total={allProjects.length}
    />
  );
}
