import crypto from 'crypto';
import { z } from 'zod';
import { UserRepository } from '../repositories/user-repository';
import { RefreshTokenRepository } from '../repositories/refresh-token-repository';
import { verifyPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { sha256Hex } from '../../utils/hash';
import { AppError } from '../../utils/app-error';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;

const REFRESH_TOKEN_TTL_MS = parseInt(process.env.REFRESH_TOKEN_TTL_MS ?? '604800000', 10); // 7d default

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(input: LoginInput) {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user || !user.password_hash) {
      throw AppError.unauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
      throw AppError.unauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    }

    const accessToken = signToken({
      sub: user.id,
      role: user.role,
      tokenVersion: user.token_version,
    });

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = sha256Hex(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.refreshTokenRepository.replaceTokenForUser({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
