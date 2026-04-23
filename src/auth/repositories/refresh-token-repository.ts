import { sql } from '../../db/client';

export type RefreshTokenRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

export type CreateRefreshTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export class RefreshTokenRepository {
  async replaceTokenForUser(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    await sql`DELETE FROM refresh_tokens WHERE user_id = ${input.userId}`;

    const rows = await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${input.userId}, ${input.tokenHash}, ${input.expiresAt})
      RETURNING id, user_id, token_hash, expires_at, used_at, created_at
    `;
    return rows[0] as RefreshTokenRecord;
  }

  async consumeByTokenHash(tokenHash: string): Promise<string | null> {
    const now = new Date();

    const found = await sql`
      SELECT id, user_id
      FROM refresh_tokens
      WHERE token_hash = ${tokenHash}
        AND used_at IS NULL
        AND expires_at > ${now}
      LIMIT 1
    `;

    if (!found[0]) return null;

    const record = found[0] as { id: string; user_id: string };

    const updated = await sql`
      UPDATE refresh_tokens
      SET used_at = ${now}
      WHERE id = ${record.id}
        AND used_at IS NULL
        AND expires_at > ${now}
    `;

    const count = (updated as unknown as { rowCount?: number }).rowCount ?? 0;
    if (count !== 1) return null;

    return record.user_id;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await sql`DELETE FROM refresh_tokens WHERE user_id = ${userId}`;
  }
}
