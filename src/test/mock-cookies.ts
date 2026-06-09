import { vi } from "vitest";

const mocks = vi.hoisted(() => {
  const cookieGet = vi.fn();
  const cookieSet = vi.fn();
  const cookieDelete = vi.fn();
  return {
    cookieGet,
    cookieSet,
    cookieDelete,
    cookies: vi.fn(async () => ({
      get: cookieGet,
      set: cookieSet,
      delete: cookieDelete,
    })),
  };
});

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

export const cookieGet = mocks.cookieGet;
export const cookieSet = mocks.cookieSet;
export const cookieDelete = mocks.cookieDelete;
