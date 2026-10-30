import { del } from "@vercel/blob";

import { listBooks } from "./book-store";
import { getPreferences } from "./preferences";
import { query, withTransaction } from "./db";
import {
  buildExportDocument,
  collectBlobUrls,
  type ExportDocument,
} from "./export-shape";
import { verifyPassword } from "./password";
import { clearSessionCookie } from "./session-cookies";
import type {
  Book,
  Story,
  StoryPage,
  StoryStatus,
  StoryType,
} from "./types";
import { findPasswordHashById, findUserById } from "./users";

interface AccountRow {
  id: string;
  email: string;
  created_at: Date | string;
}

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
  page_count: number | string;
  current_page: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface StoryPageRow {
  id: string;
  story_id: string;
  page_number: number;
  content: string;
  image_path: string | null;
  image_alt: string | null;
}

export interface UserContent {
  books: Book[];
  stories: Story[];
}

export interface DeleteContentResult {
  deletedBooks: number;
  deletedStories: number;
  deletedBlobs: number;
}

export interface DeleteAccountInput {
  email: string;
  password: string;
  confirmation: string;
}

export type DeleteAccountResult = { ok: true } | { error: string };

const SESSION_EXPIRED_ERROR =
  "Your session has expired. Sign in again to continue.";
const CONFIRMATION_ERROR = 'Type DELETE to confirm this action.';
const EMAIL_MISMATCH_ERROR =
  "The email address you typed does not match your account.";
const PASSWORD_MISMATCH_ERROR = "Current password is incorrect.";

function iso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toStoryPage(row: StoryPageRow): StoryPage {
  return {
    id: String(row.id),
    pageNumber: Number(row.page_number),
    content: row.content,
    imageUrl: row.image_path,
    imageAlt: row.image_alt,
  };
}

function toStory(row: StoryRow, pages: StoryPageRow[]): Story {
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
    pages: pages.map(toStoryPage),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function loadUserContent(userId: string): Promise<UserContent> {
  const [books, storyResult, pageResult] = await Promise.all([
    listBooks(userId),
    query<StoryRow>(
      `select s.*,
         (select count(*) from public.story_pages p where p.story_id = s.id) as page_count,
         coalesce((select current_page from public.story_progress rp where rp.story_id = s.id), 1) as current_page
       from public.stories s
       where s.user_id = $1
       order by s.updated_at desc, s.id desc`,
      [userId]
    ),
    query<StoryPageRow>(
      `select p.id, p.story_id, p.page_number, p.content, p.image_path, p.image_alt
       from public.story_pages p
       join public.stories s on s.id = p.story_id
       where s.user_id = $1
       order by p.story_id, p.page_number`,
      [userId]
    ),
  ]);

  const pagesByStory = new Map<string, StoryPageRow[]>();
  for (const page of pageResult.rows) {
    const storyId = String(page.story_id);
    const pages = pagesByStory.get(storyId);
    if (pages) {
      pages.push(page);
    } else {
      pagesByStory.set(storyId, [page]);
    }
  }

  return {
    books,
    stories: storyResult.rows.map((row) =>
      toStory(row, pagesByStory.get(String(row.id)) ?? [])
    ),
  };
}

export async function buildUserExport(
  userId: string
): Promise<ExportDocument | null> {
  const { rows } = await query<AccountRow>(
    "select id, email, created_at from public.users where id = $1",
    [userId]
  );
  const account = rows[0];

  if (!account) {
    return null;
  }

  const [preferences, content] = await Promise.all([
    getPreferences(userId),
    loadUserContent(userId),
  ]);

  return buildExportDocument({
    account: {
      id: String(account.id),
      email: account.email,
      createdAt: iso(account.created_at),
    },
    preferences,
    books: content.books,
    stories: content.stories,
  });
}

export async function deleteAllUserContent(
  userId: string
): Promise<DeleteContentResult> {
  const content = await loadUserContent(userId);
  const blobUrls = collectBlobUrls(content);

  const deletionResults = await Promise.allSettled(
    blobUrls.map((url) => del(url))
  );
  const failedDeletions = deletionResults.filter(
    (result) => result.status === "rejected"
  ).length;

  if (failedDeletions > 0) {
    throw new Error(
      `Could not delete ${failedDeletions} of ${blobUrls.length} stored files. No library content was removed.`
    );
  }

  return withTransaction(async (client) => {
    const books = await client.query(
      "delete from public.books where user_id = $1",
      [userId]
    );
    const stories = await client.query(
      "delete from public.stories where user_id = $1",
      [userId]
    );

    return {
      deletedBooks: books.rowCount ?? 0,
      deletedStories: stories.rowCount ?? 0,
      deletedBlobs: blobUrls.length,
    };
  });
}

export async function deleteUserAccount(
  userId: string,
  input: DeleteAccountInput
): Promise<DeleteAccountResult> {
  const user = await findUserById(userId);

  if (!user) {
    return { error: SESSION_EXPIRED_ERROR };
  }

  if (input.confirmation !== "DELETE") {
    return { error: CONFIRMATION_ERROR };
  }

  if (input.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    return { error: EMAIL_MISMATCH_ERROR };
  }

  const passwordHash = await findPasswordHashById(userId);
  if (!passwordHash) {
    return { error: SESSION_EXPIRED_ERROR };
  }

  const passwordValid = await verifyPassword(input.password, passwordHash);
  if (!passwordValid) {
    return { error: PASSWORD_MISMATCH_ERROR };
  }

  await deleteAllUserContent(userId);

  const { rowCount } = await query("delete from public.users where id = $1", [
    userId,
  ]);

  if (!rowCount) {
    throw new Error("User not found after content deletion.");
  }

  try {
    await clearSessionCookie();
  } catch (error) {
    console.error(
      "[data-export] session cookie cleanup failed:",
      error instanceof Error ? error.message : "unknown error"
    );
  }

  return { ok: true };
}
