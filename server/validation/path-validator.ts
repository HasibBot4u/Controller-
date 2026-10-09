import path from 'path';

export class FileSafetyError extends Error {
  public readonly code = 'INVALID_FILE_PATH';
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'FileSafetyError';
  }
}

/**
 * Validates that a file path is safe and strictly project-relative.
 * Rejects absolute paths, directory traversal (`..`), null bytes, and paths outside project bounds.
 */
export function validateRelativeFilePath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new FileSafetyError('Path must be a non-empty string');
  }

  const MAX_PATH_LENGTH = 1024;
  if (rawPath.length > MAX_PATH_LENGTH) {
    throw new FileSafetyError(`File path exceeds maximum allowed length of ${MAX_PATH_LENGTH} characters`);
  }

  // Reject null byte injection
  if (rawPath.includes('\0')) {
    throw new FileSafetyError('Path contains null bytes');
  }

  // Reject URL encoded traversal attacks & catch decodeURIComponent failures
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch (_e) {
    throw new FileSafetyError('Malformed percent encoding in file path');
  }

  // Reject null bytes inside decoded string as well
  if (decoded.includes('\0')) {
    throw new FileSafetyError('Path contains null bytes');
  }

  const decodedSegments = decoded.split(/[/\\]/);
  const rawSegments = rawPath.split(/[/\\]/);
  if (decodedSegments.some((seg) => seg === '..') || rawSegments.some((seg) => seg === '..')) {
    throw new FileSafetyError('Directory traversal sequences (..) are forbidden');
  }

  // Reject leading slashes or Windows drive letters
  if (decoded.startsWith('/') || decoded.startsWith('\\') || /^[a-zA-Z]:/.test(decoded) || /^[a-zA-Z]:/.test(rawPath)) {
    throw new FileSafetyError('Absolute paths are forbidden; path must be project-relative');
  }

  // Normalize path and ensure it doesn't escape
  const normalized = path.normalize(decoded).replace(/\\/g, '/');
  if (normalized.startsWith('../') || normalized === '..') {
    throw new FileSafetyError('Path escapes project root directory');
  }

  // Trim leading './' if present
  return normalized.replace(/^\.\//, '');
}
