export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: ErrorOptions & { headers?: Record<string, string> }
  ) {
    super(message, options);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.headers = options?.headers;
  }
}
