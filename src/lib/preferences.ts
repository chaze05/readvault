import { query } from "./db";
import { preferencesSchema, type PreferencesInput } from "./validation";

export type PdfZoom = 75 | 100 | 125 | 150;
export type StoryTextSize = "small" | "medium" | "large";

export interface UserPreferences {
  pdfZoom: PdfZoom;
  storyTextSize: StoryTextSize;
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  pdfZoom: 100,
  storyTextSize: "medium",
  reduceMotion: false,
};

interface PreferenceRow {
  pdf_zoom: number;
  story_text_size: string;
  reduce_motion: boolean;
}

function parseRow(row: PreferenceRow | undefined): UserPreferences {
  const parsed = preferencesSchema.safeParse({
    pdfZoom: row?.pdf_zoom,
    storyTextSize: row?.story_text_size,
    reduceMotion: row?.reduce_motion,
  });

  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}

export async function getPreferences(
  userId: string
): Promise<UserPreferences> {
  await query(
    `insert into public.user_preferences (user_id)
     values ($1)
     on conflict (user_id) do nothing`,
    [userId]
  );

  const { rows } = await query<PreferenceRow>(
    `select pdf_zoom, story_text_size, reduce_motion
     from public.user_preferences
     where user_id = $1`,
    [userId]
  );

  return parseRow(rows[0]);
}

export async function updatePreferences(
  userId: string,
  input: PreferencesInput
): Promise<UserPreferences> {
  const parsed = preferencesSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid preferences.");
  }

  const { rows } = await query<PreferenceRow>(
    `insert into public.user_preferences
       (user_id, pdf_zoom, story_text_size, reduce_motion, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (user_id) do update
       set pdf_zoom = excluded.pdf_zoom,
           story_text_size = excluded.story_text_size,
           reduce_motion = excluded.reduce_motion,
           updated_at = now()
     returning pdf_zoom, story_text_size, reduce_motion`,
    [
      userId,
      parsed.data.pdfZoom,
      parsed.data.storyTextSize,
      parsed.data.reduceMotion,
    ]
  );

  return parseRow(rows[0]);
}
