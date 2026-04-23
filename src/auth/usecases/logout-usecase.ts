import { RefreshTokenRepository } from '../repositories/refresh-token-repository';
import { UserRepository } from '../repositories/user-repository';

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.refreshTokenRepository.deleteByUserId(userId);
    await this.userRepository.incrementTokenVersion(userId);
  }
}
