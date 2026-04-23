import { prisma } from '../../db/client';
import type { RefreshToken } from '@prisma/client';

export type { RefreshToken };

export type CreateRefreshTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export class RefreshTokenRepository {
  async replaceTokenForUser(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    await prisma.refreshToken.deleteMany({ where: { user_id: input.userId } });

    return prisma.refreshToken.create({
      data: {
        user_id: input.userId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt,
      },
    });
  }

  async consumeByTokenHash(tokenHash: string): Promise<string | null> {
    const now = new Date();

    const token = await prisma.refreshToken.findFirst({
      where: {
        token_hash: tokenHash,
        used_at: null,
        expires_at: { gt: now },
      },
      select: { id: true, user_id: true },
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

    return token.user_id;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { user_id: userId } });
  }
}
