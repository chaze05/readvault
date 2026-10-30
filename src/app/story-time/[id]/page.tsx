import { notFound, redirect } from "next/navigation";

import { StoryReader } from "@/components/story-reader";
import { requireActiveUser } from "@/lib/current-user";
import { clampPage, parseRequestedPage } from "@/lib/page-query";
import { getPreferences } from "@/lib/preferences";
import { getStory } from "@/lib/story-store";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReadStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireActiveUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const story = await getStory(user.id, id);
  if (!story) notFound();

  const preferences = await getPreferences(user.id);
  const { page } = await searchParams;
  const requestedPage = parseRequestedPage(page);
  const pageCount = story.pages?.length || story.pageCount;
  const initialPage =
    requestedPage === null
      ? undefined
      : clampPage(requestedPage, pageCount);

  return (
    <StoryReader
      storyId={story.id}
      initialStory={story}
      textSize={preferences.storyTextSize}
      initialPage={initialPage}
      isFavorite={story.isFavorite}
    />
  );
}
