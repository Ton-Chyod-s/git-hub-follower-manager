import { prisma } from '../../db/client';
import type { RefreshToken } from '@prisma/client';

export type { RefreshToken };

export type CreateRefreshTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  encryptedGithubToken?: string;
};

export type ConsumedRefreshToken = {
  userId: string;
  encryptedGithubToken: string | null;
};

export class RefreshTokenRepository {
  async replaceTokenForUser(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    await prisma.refreshToken.deleteMany({ where: { user_id: input.userId } });

    return prisma.refreshToken.create({
      data: {
        user_id: input.userId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt,
        github_access_token: input.encryptedGithubToken ?? null,
      },
    });
  }

  async consumeByTokenHash(tokenHash: string): Promise<ConsumedRefreshToken | null> {
    const now = new Date();

    const token = await prisma.refreshToken.findFirst({
      where: {
        token_hash: tokenHash,
        used_at: null,
        expires_at: { gt: now },
      },
      select: { id: true, user_id: true, github_access_token: true },
    });

    if (!token) return null;

    const updated = await prisma.refreshToken.updateMany({
      where: {
        id: token.id,
        used_at: null,
        expires_at: { gt: now },
      },
      data: { used_at: now },
    });

    if (updated.count !== 1) return null;

    return {
      userId: token.user_id,
      encryptedGithubToken: token.github_access_token,
    };
  }

  async updateGithubToken(userId: string, encryptedToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { user_id: userId, used_at: null },
      data: { github_access_token: encryptedToken },
    });
  }

  async hasGithubToken(userId: string): Promise<boolean> {
    const token = await prisma.refreshToken.findFirst({
      where: { user_id: userId, used_at: null, github_access_token: { not: null } },
      select: { id: true },
    });
    return token !== null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { user_id: userId } });
  }
}
