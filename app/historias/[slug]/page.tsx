import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMyStoryLikes, getSiteContent, getStoryBySlug, getViewer } from "@/lib/data";
import StoryView from "./StoryView";
import "@/components/admin/admin.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return { title: "Piedrahíta — Historias" };

  const title = story.seoTitle || story.title;
  const description = story.seoDescription || story.excerpt;

  return {
    title: `Piedrahíta — ${title}`,
    description,
    openGraph: {
      title,
      description,
      images: story.coverImage ? [story.coverImage] : undefined,
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [story, site, viewer, likedIds] = await Promise.all([
    getStoryBySlug(slug),
    getSiteContent(),
    getViewer(),
    getMyStoryLikes(),
  ]);

  if (!story) notFound();

  return (
    <StoryView
      story={story}
      site={site}
      viewer={viewer}
      likedInitially={likedIds.includes(story.id)}
    />
  );
}
