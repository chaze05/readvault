import { notFound, redirect } from "next/navigation";

import { StoryReader } from "@/components/story-reader";
import { requireActiveUser } from "@/lib/current-user";
import { getPreferences } from "@/lib/preferences";
import { getStory } from "@/lib/story-store";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRequestedPage(value: string | undefined): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

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
      : Math.min(
          Math.max(1, requestedPage),
          pageCount > 0 ? pageCount : Math.max(1, requestedPage)
        );

  return (
    <StoryReader
      storyId={story.id}
      initialStory={story}
      textSize={preferences.storyTextSize}
      initialPage={initialPage}
    />
  );
}
