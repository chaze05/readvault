export function isCloudMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_STORAGE_DRIVER === "blob" ||
    process.env.STORAGE_DRIVER === "blob"
  );
}
