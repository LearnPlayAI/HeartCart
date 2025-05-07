import { Readable } from 'stream';

export interface RequestError {
  message?: string;
  code?: string;
  status?: number;
}

export interface OkResult<T> {
  ok: T;
}

export interface ErrResult<E, U = unknown> {
  err: E;
  unknown?: U;
}

export type Result<T, E, U = unknown> = OkResult<T> | ErrResult<E, U>;

export interface StorageObject {
  name: string;
  bucket: string;
  size?: number;
  contentType?: string;
  contentEncoding?: string;
  etag?: string;
  generation?: string;
  metageneration?: string;
  created?: Date;
  updated?: Date;
  customMetadata?: Record<string, string>;
}

export interface ListOptions {
  prefix?: string;
  startOffset?: string;
  endOffset?: string;
  includeTrailingDelimiter?: boolean;
  versions?: boolean;
  autoPaginate?: boolean;
  maxResults?: number;
  pageToken?: string;
}

export interface UploadOptions {
  compress?: boolean;
}

// Using this type to match the actual Replit client, avoiding strict interface checking
export type ReplitObjectStorageClient = {
  exists(filename: string): Promise<Result<boolean, RequestError, unknown>>;
  delete(filename: string): Promise<Result<null, RequestError, unknown>>;
  downloadAsBytes(filename: string): Promise<Result<Buffer, RequestError, unknown>>;
  downloadAsText(filename: string): Promise<Result<string, RequestError, unknown>>;
  downloadAsStream(filename: string): Promise<Result<Readable, RequestError, unknown>>;
  list(options?: ListOptions): Promise<Result<StorageObject[], RequestError, unknown>>;
  uploadFromBytes(filename: string, contents: Buffer, options?: UploadOptions): Promise<Result<null, RequestError, unknown>>;
  uploadFromText(filename: string, contents: string, options?: UploadOptions): Promise<Result<null, RequestError, unknown>>;
  uploadFromFilename(filename: string, sourcePath: string, options?: UploadOptions): Promise<Result<null, RequestError, unknown>>;
  
  // Additional methods we won't use but might exist
  [key: string]: any;
}