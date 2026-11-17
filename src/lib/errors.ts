export type AppErrorCode = "not_found" | "forbidden" | "invalid";

/** An expected failure with a message that is safe to show to the member. */
export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "That page") => new AppError("not_found", `${what} doesn't exist or was deleted.`);
export const forbidden = (message = "You can only change things you posted.") => new AppError("forbidden", message);
export const invalid = (message: string) => new AppError("invalid", message);
