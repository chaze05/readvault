import { z } from "zod";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(300, "Title must be 300 characters or fewer.");

const authorSchema = z
  .string()
  .trim()
  .max(200, "Author must be 200 characters or fewer.")
  .optional()
  .transform((value) => value || "Unknown author");

const categorySchema = z
  .string()
  .trim()
  .max(100, "Category must be 100 characters or fewer.")
  .optional()
  .transform((value) => value || "Uncategorized");

const bookFields = {
  title: titleSchema,
  author: authorSchema,
  category: categorySchema,
};

export const bookCreateSchema = z.object(bookFields);
export const bookUpdateSchema = z.object(bookFields);

const authEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200)
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password must be 72 bytes or fewer."
  );

export const signUpSchema = z.object({
  email: authEmailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, "Password is required.").max(200),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required.")
      .max(200),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, "Password is required.").max(200),
  confirmation: z.literal("DELETE", {
    error: "Type DELETE to confirm account deletion.",
  }),
});

export const familyAccountInputSchema = z.object({
  email: authEmailSchema,
  method: z.enum(["invite", "temporary_password"]),
});

export const preferencesSchema = z.object({
  pdfZoom: z.union([
    z.literal(75),
    z.literal(100),
    z.literal(125),
    z.literal(150),
  ]),
  storyTextSize: z.enum(["small", "medium", "large"]),
  reduceMotion: z.boolean(),
});

export const aiSettingsInputSchema = z.object({
  provider: z.enum(["deepseek", "openai", "custom"]),
  baseUrl: z.url("Enter a valid provider URL."),
  model: z.string().trim().min(1, "Model is required.").max(200),
  apiKey: z.string().trim().max(500).optional().default(""),
  dailyLimit: z.number().int().min(1).max(100),
});

const storyPageInputSchema = z.object({
  id: z.uuid().optional(),
  content: z.string().trim().min(1).max(10_000),
});

export const storyInputSchema = z
  .object({
    title: z.string().trim().min(1, "A story title is required.").max(160),
    storyType: z.enum(["original", "movie_inspired"]),
    sourceTitle: z.string().trim().max(160).optional().default(""),
    description: z.string().trim().max(1000).optional().default(""),
    ageRange: z.string().trim().max(40).optional().default("Ages 6–8"),
    language: z.string().trim().max(12).optional().default("en"),
    status: z.enum(["draft", "published"]).default("draft"),
    pages: z.array(storyPageInputSchema).max(100).default([]),
  })
  .refine(
    (data) => data.storyType !== "movie_inspired" || Boolean(data.sourceTitle),
    {
      message: "Enter the movie or inspiration title.",
      path: ["sourceTitle"],
    }
  );

export const aiStorySchema = z.object({
  title: z.string().trim().max(160).optional().default(""),
  idea: z.string().trim().min(3, "Describe the story idea first.").max(1000),
  storyType: z.enum(["original", "movie_inspired"]),
  sourceTitle: z.string().trim().max(160).optional().default(""),
  ageRange: z.string().trim().max(40).optional().default("Ages 6–8"),
});

export const cloudBookInputSchema = bookCreateSchema.extend({
  fileName: z.string().trim().min(1).max(255),
  fileHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "Invalid file hash."),
  fileUrl: z.url("Invalid file URL."),
});

export const progressSchema = z.object({
  currentPage: z.number().int().min(0, "Page cannot be negative.").max(1_000_000),
  totalPages: z.number().int().min(0).max(1_000_000).optional(),
});

export const bookmarkTargetSchema = z
  .object({
    bookId: z.uuid().optional(),
    storyId: z.uuid().optional(),
    pageNumber: z.number().int().min(1, "Page number must be at least 1."),
  })
  .refine((value) => Boolean(value.bookId) !== Boolean(value.storyId), {
    message: "Choose exactly one of a book or a story.",
  });

export const bookmarkNoteSchema = z.object({
  note: z
    .string({ error: "Note is required." })
    .trim()
    .max(500, "Note must be 500 characters or fewer."),
});

export const favoriteInputSchema = z.object({
  kind: z.enum(["book", "story"]),
  id: z.uuid(),
  isFavorite: z.boolean(),
});

export type BookInput = z.infer<typeof bookCreateSchema>;
export type BookUpdateInput = z.infer<typeof bookUpdateSchema>;
export type CloudBookInput = z.infer<typeof cloudBookInputSchema>;
export type ProgressInput = z.infer<typeof progressSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type FamilyAccountInput = z.infer<typeof familyAccountInputSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsInputSchema>;
export type StoryInput = z.infer<typeof storyInputSchema>;
export type AiStoryInput = z.infer<typeof aiStorySchema>;
export type BookmarkTargetInput = z.infer<typeof bookmarkTargetSchema>;
export type BookmarkNoteInput = z.infer<typeof bookmarkNoteSchema>;
export type FavoriteInput = z.infer<typeof favoriteInputSchema>;

function firstIssue(result: z.ZodSafeParseResult<unknown>): string {
  return result.success
    ? ""
    : result.error.issues[0]?.message ?? "Invalid input.";
}

export function parseBookInput(
  formData: FormData
): { success: true; data: BookInput } | { success: false; error: string } {
  const result = bookCreateSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    author: String(formData.get("author") ?? ""),
    category: String(formData.get("category") ?? ""),
  });

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: firstIssue(result) };
}

export function parseBookUpdate(
  body: unknown
): { success: true; data: BookUpdateInput } | { success: false; error: string } {
  const result = bookUpdateSchema.safeParse(body);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: firstIssue(result) };
}

export function parseCloudBookInput(
  body: unknown
): { success: true; data: CloudBookInput } | { success: false; error: string } {
  const result = cloudBookInputSchema.safeParse(body);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: firstIssue(result) };
}

export function parseProgress(
  body: unknown
): { success: true; data: ProgressInput } | { success: false; error: string } {
  const result = progressSchema.safeParse(body);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: firstIssue(result) };
}

export function parseStoryInput(
  body: unknown
): { success: true; data: StoryInput } | { success: false; error: string } {
  const result = storyInputSchema.safeParse(body);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: firstIssue(result) };
}

export function parseAiStoryInput(
  body: unknown
): { success: true; data: AiStoryInput } | { success: false; error: string } {
  const result = aiStorySchema.safeParse(body);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: firstIssue(result) };
}

export function hasPdfSignature(buffer: Uint8Array): boolean {
  if (buffer.length < 5) return false;
  return new TextDecoder("ascii").decode(buffer.subarray(0, 5)) === "%PDF-";
}
