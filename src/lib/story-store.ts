import { del, head } from "@vercel/blob";

import { query, withTransaction } from "./db";
import type { Story, StoryPage, StoryStatus, StoryType } from "./types";

interface StoryRow {
  id: string;
  title: string;
  story_type: StoryType;
  source_title: string | null;
  description: string | null;
  age_range: string | null;
  language: string;
  cover_image_path: string | null;
  status: StoryStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

interface StoryPageRow {
  id: string;
  page_number: number;
  content: string;
  image_path: string | null;
  image_alt: string | null;
}

interface StoryFromRow extends StoryRow {
  page_count: number | string;
  current_page: number | string;
}

export interface StoryInput {
  title: string;
  storyType: StoryType;
  sourceTitle: string;
  description: string;
  ageRange: string;
  language: string;
  status: StoryStatus;
  pages: Array<{ id?: string; content: string }>;
}

export interface StoryImageInput {
  url: string;
  kind: "cover" | "page";
  pageId?: string;
  alt?: string;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toPage(row: StoryPageRow): StoryPage {
  return {
    id: String(row.id),
    pageNumber: Number(row.page_number),
    content: row.content,
    imageUrl: row.image_path,
    imageAlt: row.image_alt,
  };
}

function toStory(
  row: StoryFromRow,
  pages?: StoryPageRow[]
): Story {
  return {
    id: String(row.id),
    title: row.title,
    storyType: row.story_type,
    sourceTitle: row.source_title,
    description: row.description,
    ageRange: row.age_range,
    language: row.language,
    coverImageUrl: row.cover_image_path,
    status: row.status,
    pageCount: Number(row.page_count || 0),
    currentPage: Number(row.current_page || 1),
    pages: pages?.map(toPage),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

const STORY_SELECT = `
  select s.*,
    (select count(*) from public.story_pages p where p.story_id = s.id) as page_count,
    coalesce((select current_page from public.story_progress rp where rp.story_id = s.id), 1) as current_page
  from public.stories s
`;

export async function listStories(userId: string): Promise<Story[]> {
  const { rows } = await query<StoryFromRow>(
    `${STORY_SELECT}
     where s.user_id = $1
     order by s.updated_at desc, s.id desc`,
    [userId]
  );

  return rows.map((row) => toStory(row));
}

export async function getStory(
  userId: string,
  id: string
): Promise<Story | null> {
  const { rows } = await query<StoryFromRow>(
    `${STORY_SELECT}
     where s.id = $1 and s.user_id = $2`,
    [id, userId]
  );

  if (!rows[0]) return null;

  const pages = await query<StoryPageRow>(
    "select * from public.story_pages where story_id = $1 order by page_number",
    [id]
  );

  return toStory(rows[0], pages.rows);
}

export async function createStory(
  userId: string,
  input: StoryInput
): Promise<string> {
  return withTransaction(async (client) => {
    const song = await client.query<{ id: string }>(
      `insert into public.stories
         (user_id, title, story_type, source_title, description, age_range, language, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        userId,
        input.title,
        input.storyType,
        input.sourceTitle || null,
        input.description || null,
        input.ageRange || null,
        input.language || "en",
        input.status,
      ]
    );

    const storyId = song.rows[0].id;
    const pages = input.pages.filter((page) => page.content.trim());

    for (let index = 0; index < pages.length; index += 1) {
      await client.query(
        "insert into public.story_pages (story_id, page_number, content) values ($1, $2, $3)",
        [storyId, index + 1, pages[index].content.trim().slice(0, 10000)]
      );
    }

    return storyId;
  });
}

export async function updateStory(
  userId: string,
  id: string,
  input: StoryInput
): Promise<boolean> {
  return withTransaction(async (client) => {
    const owner = await client.query(
      "select id from public.stories where id = $1 and user_id = $2",
      [id, userId]
    );
    if (!owner.rows[0]) return false;

    await client.query(
      `update public.stories
       set title = $1, story_type = $2, source_title = $3, description = $4,
           age_range = $5, language = $6, status = $7, updated_at = now()
       where id = $8 and user_id = $9`,
      [
        input.title,
        input.storyType,
        input.sourceTitle || null,
        input.description || null,
        input.ageRange || null,
        input.language || "en",
        input.status,
        id,
        userId,
      ]
    );

    const existing = await client.query<{
      id: string;
      image_path: string | null;
      image_alt: string | null;
    }>(
      "select id, image_path, image_alt from public.story_pages where story_id = $1",
      [id]
    );
    const byId = new Map(existing.rows.map((page) => [String(page.id), page]));

    await client.query("delete from public.story_pages where story_id = $1", [id]);

    const pages = input.pages.filter((page) => page.content.trim());
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const old = page.id ? byId.get(page.id) : undefined;
      await client.query(
        `insert into public.story_pages
           (story_id, page_number, content, image_path, image_alt)
         values ($1, $2, $3, $4, $5)`,
        [
          id,
          index + 1,
          page.content.trim().slice(0, 10000),
          old?.image_path ?? null,
          old?.image_alt ?? null,
        ]
      );
    }

    return true;
  });
}

export async function deleteStory(
  userId: string,
  id: string
): Promise<boolean> {
  const owner = await query<{ cover_image_path: string | null }>(
    "select cover_image_path from public.stories where id = $1 and user_id = $2",
    [id, userId]
  );

  if (!owner.rows[0]) return false;

  const pages = await query<{ image_path: string | null }>(
    "select image_path from public.story_pages where story_id = $1",
    [id]
  );

  await query("delete from public.stories where id = $1 and user_id = $2", [
    id,
    userId,
  ]);

  const urls = [
    owner.rows[0].cover_image_path,
    ...pages.rows.map((page) => page.image_path),
  ].filter((url): url is string => Boolean(url));

  await Promise.all(urls.map((url) => del(url).catch(() => {})));
  return true;
}

export async function saveStoryProgress(
  userId: string,
  id: string,
  currentPage: number
): Promise<{ currentPage: number } | null> {
  const owner = await query<{ page_count: string | number }>(
    `select (select count(*) from public.story_pages p where p.story_id = s.id) as page_count
     from public.stories s where s.id = $1 and s.user_id = $2`,
    [id, userId]
  );

  if (!owner.rows[0]) return null;

  const count = Math.max(1, Number(owner.rows[0].page_count || 1));
  const page = Math.min(Math.max(1, Math.floor(currentPage)), count);

  await query(
    `insert into public.story_progress (story_id, current_page, last_read_at, updated_at)
     values ($1, $2, now(), now())
     on conflict (story_id) do update
       set current_page = excluded.current_page,
           last_read_at = now(),
           updated_at = now()`,
    [id, page]
  );

  return { currentPage: page };
}

export async function attachStoryImage(
  userId: string,
  storyId: string,
  input: StoryImageInput
): Promise<{ imageUrl: string } | null> {
  const owner = await query<{ cover_image_path: string | null }>(
    "select cover_image_path from public.stories where id = $1 and user_id = $2",
    [storyId, userId]
  );
  if (!owner.rows[0]) return null;

  const blob = await head(input.url);
  if (
    !blob.contentType.startsWith("image/") &&
    !/\.(png|jpe?g|webp)$/i.test(blob.pathname)
  ) {
    throw new Error("The uploaded file is not a supported image.");
  }

  if (input.kind === "cover") {
    const old = owner.rows[0].cover_image_path;
    await query(
      "update public.stories set cover_image_path = $1, updated_at = now() where id = $2 and user_id = $3",
      [input.url, storyId, userId]
    );
    if (old && old !== input.url) await del(old).catch(() => {});
    return { imageUrl: input.url };
  }

  if (!input.pageId) {
    throw new Error("A page is required for a page illustration.");
  }

  const page = await query<{ image_path: string | null }>(
    "select image_path from public.story_pages where id = $1 and story_id = $2",
    [input.pageId, storyId]
  );
  if (!page.rows[0]) return null;

  const old = page.rows[0].image_path;
  await query(
    `update public.story_pages
     set image_path = $1, image_alt = $2, updated_at = now()
     where id = $3 and story_id = $4`,
    [input.url, input.alt?.slice(0, 300) || null, input.pageId, storyId]
  );
  await query(
    "update public.stories set updated_at = now() where id = $1 and user_id = $2",
    [storyId, userId]
  );
  if (old && old !== input.url) await del(old).catch(() => {});

  return { imageUrl: input.url };
}
