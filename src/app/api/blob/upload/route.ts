import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { MAX_FILE_BYTES } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Blob storage is not configured." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | HandleUploadBody
    | null;

  if (!body) {
    return Response.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const response = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["application/pdf"],
      maximumSizeInBytes: MAX_FILE_BYTES,
      addRandomSuffix: true,
    }),
    onUploadCompleted: async () => {},
  });

  return Response.json(response);
}
