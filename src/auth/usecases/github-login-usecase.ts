import crypto from 'crypto';
import { UserRepository } from '../repositories/user-repository';
import { RefreshTokenRepository } from '../repositories/refresh-token-repository';
import { signToken } from '../../utils/jwt';
import { sha256Hex } from '../../utils/hash';
import { AppError } from '../../utils/appError';

const REFRESH_TOKEN_TTL_MS = parseInt(process.env.REFRESH_TOKEN_TTL_MS ?? '604800000', 10);

type GitHubTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
};

type GitHubUserResponse = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
};

type GitHubEmailEntry = {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
};

async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set');
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!res.ok) {
    throw AppError.unauthorized('Failed to exchange GitHub code for token', 'AUTH_GITHUB_TOKEN_EXCHANGE_FAILED');
  }

  const data = (await res.json()) as GitHubTokenResponse;

  if (data.error || !data.access_token) {
    throw AppError.unauthorized(
      data.error_description ?? 'GitHub token exchange failed',
      'AUTH_GITHUB_TOKEN_EXCHANGE_FAILED',
    );
  }

  return data.access_token;
}

async function fetchGitHubUser(accessToken: string): Promise<GitHubUserResponse> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    throw AppError.unauthorized('Failed to fetch GitHub user', 'AUTH_GITHUB_USER_FETCH_FAILED');
  }

  return (await res.json()) as GitHubUserResponse;
}

async function fetchGitHubPrimaryEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    throw AppError.unauthorized('Failed to fetch GitHub emails', 'AUTH_GITHUB_EMAIL_FETCH_FAILED');
  }

  const emails = (await res.json()) as GitHubEmailEntry[];
  const primary = emails.find((e) => e.primary && e.verified);

  if (!primary) {
    throw AppError.unauthorized(
      'No verified primary email found on GitHub account',
      'AUTH_GITHUB_NO_EMAIL',
    );
  }

  return primary.email;
}

export type GitHubLoginOutput = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    githubLogin: string;
  };
};

export class GitHubLoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(code: string): Promise<GitHubLoginOutput> {
    const githubAccessToken = await exchangeCodeForToken(code);

    const githubUser = await fetchGitHubUser(githubAccessToken);

    const email = githubUser.email ?? (await fetchGitHubPrimaryEmail(githubAccessToken));

    const name = githubUser.name?.trim() || githubUser.login;

    const { user } = await this.userRepository.upsertByGithubId({
      githubId: String(githubUser.id),
      email,
      name,
    });

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
        githubLogin: githubUser.login,
      },
    };
  }
}
