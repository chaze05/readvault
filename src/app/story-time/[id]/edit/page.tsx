import { StoryEditor } from "@/components/story-editor";

export const dynamic = "force-dynamic";

export default async function EditStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StoryEditor storyId={id} />;
}
