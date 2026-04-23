import { sql } from '../../db/client';
import { AppError } from '../../utils/appError';

export type UserRole = 'USER' | 'ADMIN';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  github_id: string | null;
  role: UserRole;
  token_version: number;
  created_at: Date;
  updated_at: Date;
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token_version: number;
};

export type CreateUserData = {
  name: string;
  email: string;
  passwordHash: string;
};

export type UpsertGithubUserData = {
  githubId: string;
  email: string;
  name: string;
};

export class UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const rows = await sql`
      SELECT id, name, email, password_hash, github_id, role, token_version, created_at, updated_at
      FROM users
      WHERE email = ${email.trim().toLowerCase()}
      LIMIT 1
    `;
    return (rows[0] as UserRecord) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const rows = await sql`
      SELECT id, name, email, password_hash, github_id, role, token_version, created_at, updated_at
      FROM users
      WHERE id = ${id}
      LIMIT 1
    `;
    return (rows[0] as UserRecord) ?? null;
  }

  async findByGithubId(githubId: string): Promise<UserRecord | null> {
    const rows = await sql`
      SELECT id, name, email, password_hash, github_id, role, token_version, created_at, updated_at
      FROM users
      WHERE github_id = ${githubId}
      LIMIT 1
    `;
    return (rows[0] as UserRecord) ?? null;
  }

  async create(data: CreateUserData): Promise<SafeUser> {
    const rows = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${data.name.trim()}, ${data.email.trim().toLowerCase()}, ${data.passwordHash})
      RETURNING id, name, email, role, token_version
    `;
    return rows[0] as SafeUser;
  }

  async upsertByGithubId(data: UpsertGithubUserData): Promise<{ user: UserRecord; created: boolean }> {
    const normalizedEmail = data.email.trim().toLowerCase();

    const existingByGithub = await this.findByGithubId(data.githubId);
    if (existingByGithub) {
      return { user: existingByGithub, created: false };
    }

    const existingByEmail = await this.findByEmail(normalizedEmail);
    if (existingByEmail) {
      throw AppError.conflict(
        'An account with this email already exists. Please log in with your original method.',
        'AUTH_EMAIL_ALREADY_REGISTERED',
      );
    }

    const rows = await sql`
      INSERT INTO users (name, email, github_id, role)
      VALUES (${data.name.trim()}, ${normalizedEmail}, ${data.githubId}, 'USER')
      RETURNING id, name, email, password_hash, github_id, role, token_version, created_at, updated_at
    `;

    return { user: rows[0] as UserRecord, created: true };
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await sql`
      UPDATE users
      SET token_version = token_version + 1, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }
}
