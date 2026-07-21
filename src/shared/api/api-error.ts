type ApiErrorOptions = {
  /** HTTP status code, when the failure came from a server response. */
  status?: number;
  /** The lower-level error that triggered this one (network failure, etc.). */
  cause?: unknown;
};

/**
 * A normalized transport/protocol error. Every request funneled through
 * `apiRequest` fails with an `ApiError` so callers reason about a single error
 * shape: a stable machine-readable `code` and a user-safe `message`. Business
 * rules (missing entity, mapping) belong to the entity/page `api`, not here.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, options: ApiErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status;
  }
}
