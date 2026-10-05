import { randomBytes } from "node:crypto";
import { z } from "zod";

import { hashSecret, type AuthenticatedUser } from "@/lib/auth/get-authenticated-user";

const exchangeInputSchema = z.object({
  code: z.string().min(1).max(256),
}).strict();

export type MobileAuthDependencies = {
  findCode: (codeHash: string) => Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null>;
  markCodeUsed: (codeId: string, now: Date) => Promise<boolean>;
  saveToken: (userId: string, tokenHash: string, expiresAt: Date) => Promise<void>;
  revokeToken: (tokenHash: string) => Promise<void>;
  getUserById: (userId: string) => Promise<{
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  } | null>;
  getAuthenticatedUser: (request: Request) => Promise<AuthenticatedUser | null>;
  now?: () => Date;
  generateToken?: () => string;
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function createMobileAuthHandlers(dependencies: MobileAuthDependencies) {
  return {
    exchange: async (request: Request): Promise<Response> => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse("Request body must be valid JSON.", 400);
      }

      const parsed = exchangeInputSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse("Authorization code is required.", 400);
      }

      const { code } = parsed.data;
      const codeHash = hashSecret(code);

      const codeRecord = await dependencies.findCode(codeHash);
      if (!codeRecord) {
        return errorResponse("Invalid authorization code.", 400);
      }

      if (codeRecord.usedAt !== null) {
        return errorResponse("Authorization code has already been used.", 400);
      }

      const currentTime = (dependencies.now ? dependencies.now() : new Date()).getTime();
      if (codeRecord.expiresAt.getTime() <= currentTime) {
        return errorResponse("Authorization code has expired.", 400);
      }

      const marked = await dependencies.markCodeUsed(codeRecord.id, new Date(currentTime));
      if (!marked) {
        return errorResponse("Authorization code has expired or already been used.", 400);
      }

      const rawToken = dependencies.generateToken?.() ?? randomBytes(32).toString("hex");
      const tokenHash = hashSecret(rawToken);
      const expiresAt = new Date(currentTime + 30 * 24 * 60 * 60 * 1000); // 30 days

      await dependencies.saveToken(codeRecord.userId, tokenHash, expiresAt);
      const user = await dependencies.getUserById(codeRecord.userId);

      return Response.json({
        token: rawToken,
        tokenType: "Bearer",
        expiresAt: expiresAt.toISOString(),
        user: {
          id: user?.id ?? codeRecord.userId,
          name: user?.name ?? null,
          email: user?.email ?? null,
        },
      });
    },

    logout: async (request: Request): Promise<Response> => {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const rawToken = authHeader.slice(7).trim();
        if (rawToken) {
          const tokenHash = hashSecret(rawToken);
          await dependencies.revokeToken(tokenHash);
          return Response.json({ success: true, message: "Logged out successfully." });
        }
      }

      const authUser = await dependencies.getAuthenticatedUser(request);
      if (!authUser) {
        return errorResponse("Sign in is required to log out.", 401);
      }

      return Response.json({ success: true, message: "Logged out successfully." });
    },

    me: async (request: Request): Promise<Response> => {
      const authUser = await dependencies.getAuthenticatedUser(request);
      if (!authUser) {
        return errorResponse("Sign in is required.", 401);
      }

      const user = await dependencies.getUserById(authUser.id);
      if (!user) {
        return errorResponse("User not found.", 404);
      }

      return Response.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        },
      });
    },
  };
}
