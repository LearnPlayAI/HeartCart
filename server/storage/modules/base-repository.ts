import { db } from "../../db";
import { logger } from "../../logger";

export abstract class BaseRepository {
  protected db = db;
  protected logger = logger;

  protected handleError(operation: string, error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`${operation} failed:`, errorMessage);
    throw error;
  }

  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
}
