export class DuplicateBookError extends Error {
  readonly existingId: string;

  constructor(existingId: string) {
    super("This PDF is already in your library.");
    this.name = "DuplicateBookError";
    this.existingId = existingId;
  }
}
