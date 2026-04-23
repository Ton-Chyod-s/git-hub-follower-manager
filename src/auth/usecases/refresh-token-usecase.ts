import crypto from 'crypto';
import { UserRepository } from '../repositories/user-repository';
import { RefreshTokenRepository } from '../repositories/refresh-token-repository';
import { signToken } from '../../utils/jwt';
import { sha256Hex } from '../../utils/hash';
import { AppError } from '../../utils/app-error';

const REFRESH_TOKEN_TTL_MS = parseInt(process.env.REFRESH_TOKEN_TTL_MS ?? '604800000', 10);

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(rawRefreshToken: string) {
    const tokenHash = sha256Hex(rawRefreshToken);

    const userId = await this.refreshTokenRepository.consumeByTokenHash(tokenHash);
    if (!userId) {
      throw AppError.unauthorized('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.unauthorized('User not found', 'REFRESH_TOKEN_INVALID');
    }

    const accessToken = signToken({
      sub: user.id,
      role: user.role,
      tokenVersion: user.token_version,
    });

    const newRawToken = crypto.randomBytes(64).toString('hex');
    const newTokenHash = sha256Hex(newRawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.refreshTokenRepository.replaceTokenForUser({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken: newRawToken };
  }
}
