export default async function globalTeardown(): Promise<void> {
  const { closeDb } = await import("@/lib/db");
  await closeDb();
}
