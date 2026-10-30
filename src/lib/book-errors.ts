export class DuplicateBookError extends Error {
  readonly existingId: number;

  constructor(existingId: number) {
    super("This PDF is already in your library.");
    this.name = "DuplicateBookError";
    this.existingId = existingId;
  }
}
