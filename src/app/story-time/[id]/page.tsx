import { notFound, redirect } from "next/navigation";

import { StoryReader } from "@/components/story-reader";
import { getSession } from "@/lib/session-cookies";
import { getStory } from "@/lib/story-store";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReadStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const story = await getStory(session.userId, id);
  if (!story) notFound();

  return <StoryReader storyId={story.id} initialStory={story} />;
}
