import { prisma } from '../../db/client';
import { AppError } from '../../utils/app-error';
import type { User, UserRole } from '@prisma/client';

export type { User, UserRole };

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
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { github_id: githubId } });
  }

  async create(data: CreateUserData) {
    return prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password_hash: data.passwordHash,
      },
      select: { id: true, name: true, email: true, role: true, token_version: true },
    });
  }

  async upsertByGithubId(data: UpsertGithubUserData): Promise<{ user: User; created: boolean }> {
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

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        github_id: data.githubId,
        role: 'USER',
      },
    });

    return { user, created: true };
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        token_version: { increment: 1 },
        updated_at: new Date(),
      },
    });
  }
}
