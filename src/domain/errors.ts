import type { ErrorCode } from "../contracts.js";

export class BusinessError extends Error {
  readonly code: ErrorCode;
  readonly next: string;
  readonly requestId?: string;

  constructor(code: ErrorCode, happened: string, next: string, requestId?: string) {
    super(happened);
    this.name = "BusinessError";
    this.code = code;
    this.next = next;
    if (requestId !== undefined) this.requestId = requestId;
  }

  toToolText(): string {
    const extra = this.requestId ? ` Request ID ${this.requestId}.` : "";
    return `${this.code}: ${this.message}. ${this.next}${extra}`;
  }
}

export function errorText(err: unknown): string {
  if (err instanceof BusinessError) return err.toToolText();
  return "INTERNAL: Something went wrong. Try again or start a new demo workspace.";
}
