export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly expose: boolean;

  constructor(statusCode: number, message: string, code = "HTTP_ERROR", expose = true) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.expose = expose;
  }
}
