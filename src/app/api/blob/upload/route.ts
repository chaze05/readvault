import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import {
  BlobClaimError,
  claimBlobPathname,
  normalizeBlobPathname,
} from "@/lib/blob-claims";
import { requireActiveUser } from "@/lib/current-user";
import { MAX_FILE_BYTES } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let kind = "pdf";
        try {
          kind = JSON.parse(clientPayload || "{}").kind ?? "pdf";
        } catch {
          kind = "pdf";
        }

        const normalized = normalizeBlobPathname(pathname);
        const prefix =
          kind === "story-image"
            ? "readvault/story-images/"
            : "readvault/uploads/";

        if (!normalized || !normalized.startsWith(prefix)) {
          throw new BlobClaimError("Invalid upload path.");
        }

        await claimBlobPathname(user.id, normalized);

        if (kind === "story-image") {
          return {
            allowedContentTypes: IMAGE_TYPES,
            maximumSizeInBytes: MAX_IMAGE_BYTES,
            addRandomSuffix: false,
            allowOverwrite: false,
          };
        }

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async () => {},
    });

    return Response.json(response);
  } catch (error) {
    if (error instanceof BlobClaimError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
