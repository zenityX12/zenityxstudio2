/**
 * S3 Cleanup utilities for removing old/unused folders
 * 
 * This module provides functions to clean up S3 storage by removing:
 * - Old thumbnail folders (userId/thumbnails/* pattern from old code)
 * - Empty folders
 * - Orphaned files
 */

import { ENV } from './_core/env';

interface S3File {
  key: string;
  size: number;
  lastModified: string;
}

interface S3ListResponse {
  files: S3File[];
  folders: string[];
  hasMore: boolean;
  nextToken?: string;
}

/**
 * List all files and folders in S3
 */
async function listS3Objects(prefix: string = '', maxKeys: number = 1000): Promise<S3ListResponse> {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error("Storage proxy credentials missing");
  }

  const listUrl = new URL("v1/storage/list", baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  listUrl.searchParams.set("prefix", prefix);
  listUrl.searchParams.set("maxKeys", maxKeys.toString());

  const response = await fetch(listUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to list S3 objects: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Delete a file from S3
 */
async function deleteS3Object(key: string): Promise<boolean> {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error("Storage proxy credentials missing");
  }

  const deleteUrl = new URL("v1/storage/delete", baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  deleteUrl.searchParams.set("path", key);

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return response.ok;
}

/**
 * Identify old thumbnail folders (pattern: {userId}/thumbnails/*)
 * These are from old code before the fix
 */
export async function identifyOldThumbnailFolders(): Promise<string[]> {
  console.log('[S3Cleanup] Scanning for old thumbnail folders...');
  
  const result = await listS3Objects('', 10000);
  const oldFolders: string[] = [];

  // Look for folders that match the old pattern: {userId}/thumbnails/
  // These are folders at root level that are NOT "thumbnails", "uploads", "generated", "profiles"
  const validRootFolders = ['thumbnails', 'uploads', 'generated', 'profiles'];
  
  for (const folder of result.folders) {
    const parts = folder.split('/').filter(p => p);
    
    // If it's a root-level folder that's not in our valid list
    if (parts.length === 1 && !validRootFolders.includes(parts[0])) {
      // This is likely a userId folder from old code
      oldFolders.push(folder);
    }
  }

  console.log(`[S3Cleanup] Found ${oldFolders.length} old folders`);
  return oldFolders;
}

/**
 * Clean up old thumbnail folders
 * Returns count of deleted files
 */
export async function cleanupOldThumbnailFolders(): Promise<{ deletedFolders: number; deletedFiles: number; errors: string[] }> {
  console.log('[S3Cleanup] Starting cleanup of old thumbnail folders...');
  
  const oldFolders = await identifyOldThumbnailFolders();
  let deletedFiles = 0;
  const errors: string[] = [];

  for (const folder of oldFolders) {
    try {
      // List all files in this folder
      const result = await listS3Objects(folder, 10000);
      
      console.log(`[S3Cleanup] Deleting folder: ${folder} (${result.files.length} files)`);
      
      // Delete all files in the folder
      for (const file of result.files) {
        try {
          const success = await deleteS3Object(file.key);
          if (success) {
            deletedFiles++;
          } else {
            errors.push(`Failed to delete: ${file.key}`);
          }
        } catch (error) {
          errors.push(`Error deleting ${file.key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Error processing folder ${folder}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`[S3Cleanup] Cleanup complete: ${deletedFiles} files deleted from ${oldFolders.length} folders`);
  
  return {
    deletedFolders: oldFolders.length,
    deletedFiles,
    errors
  };
}

/**
 * Get S3 storage statistics
 */
export async function getS3Statistics(): Promise<{
  totalFiles: number;
  totalSize: number;
  folderCounts: Record<string, number>;
  oldFoldersCount: number;
}> {
  const result = await listS3Objects('', 10000);
  const oldFolders = await identifyOldThumbnailFolders();
  
  const folderCounts: Record<string, number> = {};
  let totalSize = 0;

  for (const file of result.files) {
    totalSize += file.size;
    
    // Get root folder name
    const rootFolder = file.key.split('/')[0];
    folderCounts[rootFolder] = (folderCounts[rootFolder] || 0) + 1;
  }

  return {
    totalFiles: result.files.length,
    totalSize,
    folderCounts,
    oldFoldersCount: oldFolders.length
  };
}

