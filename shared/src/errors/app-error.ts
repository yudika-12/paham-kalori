export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function errorMessage(e: unknown, fallback = "Terjadi kesalahan."): string {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}