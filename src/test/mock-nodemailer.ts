import { vi } from "vitest";

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}));

export const sendMail = mocks.sendMail;
export const createTransport = mocks.createTransport;
