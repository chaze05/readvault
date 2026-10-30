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

export const signUpSchema = z.object({
  email: authEmailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Password must be 72 bytes or fewer."
    ),
});

export const signInSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, "Password is required.").max(200),
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

export type BookInput = z.infer<typeof bookCreateSchema>;
export type BookUpdateInput = z.infer<typeof bookUpdateSchema>;
export type CloudBookInput = z.infer<typeof cloudBookInputSchema>;
export type ProgressInput = z.infer<typeof progressSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type StoryInput = z.infer<typeof storyInputSchema>;
export type AiStoryInput = z.infer<typeof aiStorySchema>;

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
