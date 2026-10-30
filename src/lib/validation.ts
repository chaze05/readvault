import { z } from "zod";

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

export const progressSchema = z.object({
  currentPage: z.number().int().min(0, "Page cannot be negative.").max(1_000_000),
  totalPages: z.number().int().min(0).max(1_000_000).optional(),
});

export type BookInput = z.infer<typeof bookCreateSchema>;
export type BookUpdateInput = z.infer<typeof bookUpdateSchema>;
export type ProgressInput = z.infer<typeof progressSchema>;

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

export function parseProgress(
  body: unknown
): { success: true; data: ProgressInput } | { success: false; error: string } {
  const result = progressSchema.safeParse(body);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: firstIssue(result) };
}

export function hasPdfSignature(buffer: Uint8Array): boolean {
  if (buffer.length < 5) return false;
  return new TextDecoder("ascii").decode(buffer.subarray(0, 5)) === "%PDF-";
}
