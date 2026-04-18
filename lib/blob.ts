import { put, del, head, list, copy } from "@vercel/blob";

// Custom token name for this project
const BLOB_TOKEN = process.env.rms_READ_WRITE_TOKEN;

/**
 * Vercel Blob Storage Utility
 *
 * This module provides helper functions for interacting with Vercel Blob Storage.
 * Make sure to set rms_READ_WRITE_TOKEN in your environment variables.
 *
 * @see https://vercel.com/docs/storage/vercel-blob
 */

/**
 * Upload a file to blob storage
 * @param pathname - The path/filename for the blob
 * @param file - The file content (File, Blob, ArrayBuffer, or string)
 * @param options - Optional configuration
 * @returns The blob result with url, pathname, etc.
 */
export async function uploadBlob(
  pathname: string,
  file: File | Blob | ArrayBuffer | string,
  options?: {
    access?: "public" | "private";
    addRandomSuffix?: boolean;
    cacheControlMaxAge?: number;
    contentType?: string;
  }
) {
  return put(pathname, file, {
    access: options?.access ?? "public",
    addRandomSuffix: options?.addRandomSuffix ?? true,
    cacheControlMaxAge: options?.cacheControlMaxAge,
    contentType: options?.contentType,
    token: BLOB_TOKEN,
  });
}

/**
 * Delete a blob from storage
 * @param url - The URL of the blob to delete
 * @returns The deletion result
 */
export async function deleteBlob(url: string) {
  return del(url, {
    token: BLOB_TOKEN,
  });
}

/**
 * Get metadata about a blob
 * @param url - The URL of the blob
 * @returns The blob metadata or null if not found
 */
export async function getBlobMetadata(url: string) {
  return head(url, {
    token: BLOB_TOKEN,
  });
}

/**
 * List all blobs in storage
 * @param options - Optional filtering options
 * @returns List of blobs
 */
export async function listBlobs(options?: {
  limit?: number;
  prefix?: string;
  cursor?: string;
}) {
  return list({
    limit: options?.limit,
    prefix: options?.prefix,
    cursor: options?.cursor,
    token: BLOB_TOKEN,
  });
}

/**
 * Copy a blob to a new location
 * @param sourceUrl - The URL of the source blob
 * @param destinationPathname - The path for the new blob
 * @param options - Optional configuration
 * @returns The new blob result
 */
export async function copyBlob(
  sourceUrl: string,
  destinationPathname: string,
  options?: {
    access?: "public" | "private";
    addRandomSuffix?: boolean;
  }
) {
  return copy(sourceUrl, destinationPathname, {
    access: options?.access ?? "public",
    addRandomSuffix: options?.addRandomSuffix ?? true,
    token: BLOB_TOKEN,
  });
}

/**
 * Check if blob storage is configured
 * @returns boolean indicating if blob storage is available
 */
export function isBlobConfigured(): boolean {
  return !!BLOB_TOKEN;
}

/**
 * Upload an image file with automatic content type detection
 * @param pathname - The path/filename for the image
 * @param file - The image file
 * @returns The blob result
 */
export async function uploadImage(pathname: string, file: File | Blob) {
  const contentType = file.type || "image/jpeg";
  
  return uploadBlob(pathname, file, {
    access: "public",
    contentType,
    cacheControlMaxAge: 31536000, // 1 year cache
  });
}

/**
 * Upload a document file
 * @param pathname - The path/filename for the document
 * @param file - The document file
 * @returns The blob result
 */
export async function uploadDocument(pathname: string, file: File | Blob) {
  const contentType = file.type || "application/octet-stream";
  
  return uploadBlob(pathname, file, {
    access: "public",
    contentType,
    cacheControlMaxAge: 86400, // 1 day cache
  });
}