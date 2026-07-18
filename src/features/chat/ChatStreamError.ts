export class ChatStreamError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly errorCode: string,
  ) {
    super(message);
    this.name = "ChatStreamError";
  }
}
