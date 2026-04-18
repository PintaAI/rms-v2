import { NextRequest, NextResponse } from "next/server";
import { uploadBlob, deleteBlob, getBlobMetadata, listBlobs, copyBlob, isBlobConfigured } from "@/lib/blob";

/**
 * GET /api/upload
 * List blobs or get metadata for a specific blob
 * 
 * Query params:
 * - url: (optional) Get metadata for a specific blob URL
 * - prefix: (optional) Filter blobs by prefix
 * - limit: (optional) Limit number of results (default: 100)
 * - cursor: (optional) Pagination cursor
 * 
 * Response:
 * - If url provided: { success, blob: { url, pathname, contentType, ... } }
 * - Otherwise: { success, blobs: [...], hasMore, cursor }
 */
export async function GET(request: NextRequest) {
  try {
    // Check if blob storage is configured
    if (!isBlobConfigured()) {
      return NextResponse.json(
        { error: "Blob storage is not configured. Set rms_READ_WRITE_TOKEN environment variable." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const prefix = searchParams.get("prefix") ?? undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const cursor = searchParams.get("cursor") ?? undefined;

    // Get metadata for a specific blob
    if (url) {
      const blob = await getBlobMetadata(url);
      
      if (!blob) {
        return NextResponse.json(
          { error: "Blob not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        blob: {
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          contentDisposition: blob.contentDisposition,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        },
      });
    }

    // List blobs
    const result = await listBlobs({
      prefix,
      limit,
      cursor,
    });

    return NextResponse.json({
      success: true,
      blobs: result.blobs.map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      })),
      hasMore: result.hasMore,
      cursor: result.cursor,
    });
  } catch (error) {
    console.error("Blob operation error:", error);
    return NextResponse.json(
      { error: "Failed to perform blob operation" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/upload
 * Upload a file to Vercel Blob Storage
 * 
 * Request body (multipart/form-data):
 * - file: The file to upload
 * - pathname: (optional) Custom path/filename for the blob
 * 
 * Response:
 * - success: boolean
 * - blob: { url, pathname, contentType, ... }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if blob storage is configured
    if (!isBlobConfigured()) {
      console.error("[Upload API] Blob storage is not configured");
      return NextResponse.json(
        { error: "Blob storage is not configured. Set rms_READ_WRITE_TOKEN environment variable." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pathname = formData.get("pathname") as string | null;

    console.log("[Upload API] Received upload request:", {
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      requestedPathname: pathname,
    });

    if (!file) {
      console.error("[Upload API] No file provided in request");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Generate pathname if not provided
    const blobPathname = pathname || `uploads/${Date.now()}-${file.name}`;

    console.log("[Upload API] Uploading to path:", blobPathname);

    // Upload the file
    const blob = await uploadBlob(blobPathname, file, {
      access: "public",
      contentType: file.type || undefined,
    });

    console.log("[Upload API] Upload successful:", {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });

    return NextResponse.json({
      success: true,
      blob: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        contentDisposition: blob.contentDisposition,
      },
    });
  } catch (error) {
    console.error("[Upload API] Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/upload
 * Copy a blob to a new location
 * 
 * Request body (JSON):
 * - sourceUrl: The URL of the source blob
 * - destinationPathname: The path for the new blob
 * - addRandomSuffix: (optional) Add random suffix to prevent overwrites (default: true)
 * 
 * Response:
 * - success: boolean
 * - blob: { url, pathname, ... }
 */
export async function PUT(request: NextRequest) {
  try {
    // Check if blob storage is configured
    if (!isBlobConfigured()) {
      return NextResponse.json(
        { error: "Blob storage is not configured. Set rms_READ_WRITE_TOKEN environment variable." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { sourceUrl, destinationPathname, addRandomSuffix = true } = body;

    if (!sourceUrl || !destinationPathname) {
      return NextResponse.json(
        { error: "sourceUrl and destinationPathname are required" },
        { status: 400 }
      );
    }

    const blob = await copyBlob(sourceUrl, destinationPathname, {
      addRandomSuffix,
    });

    return NextResponse.json({
      success: true,
      blob: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        contentDisposition: blob.contentDisposition,
      },
    });
  } catch (error) {
    console.error("Copy error:", error);
    return NextResponse.json(
      { error: "Failed to copy blob" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload
 * Delete a file from Vercel Blob Storage
 * 
 * Request body (JSON):
 * - url: The URL of the blob to delete
 * 
 * Response:
 * - success: boolean
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check if blob storage is configured
    if (!isBlobConfigured()) {
      return NextResponse.json(
        { error: "Blob storage is not configured. Set rms_READ_WRITE_TOKEN environment variable." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "No URL provided" },
        { status: 400 }
      );
    }

    await deleteBlob(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}