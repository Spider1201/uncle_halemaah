import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import {
  findMobileAuthCode,
  getUserById,
  markMobileAuthCodeUsed,
  revokeMobileToken,
  saveMobileToken,
} from "@/server/mobile-auth/database";
import { createMobileAuthHandlers } from "@/server/mobile-auth/handlers";

const handlers = createMobileAuthHandlers({
  findCode: findMobileAuthCode,
  markCodeUsed: markMobileAuthCodeUsed,
  saveToken: saveMobileToken,
  revokeToken: revokeMobileToken,
  getUserById,
  getAuthenticatedUser,
});

export const POST = handlers.logout;
