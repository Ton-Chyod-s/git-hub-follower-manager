import crypto from 'crypto';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { GitHubLoginUseCase } from '../usecases/github-login-usecase';
import { UserRepository } from '../repositories/user-repository';
import { RefreshTokenRepository } from '../repositories/refresh-token-repository';
import { createResponse } from '../../utils/create-response';
import { httpStatusCodes } from '../../utils/http-constants';
import { AppError } from '../../utils/app-error';

export const GITHUB_STATE_COOKIE = 'github_oauth_state';

const githubLoginUseCase = new GitHubLoginUseCase(
  new UserRepository(),
  new RefreshTokenRepository(),
);

const APP_NAME = process.env.APP_NAME ?? 'app';
const AUTH_COOKIE = `${APP_NAME}_token`;
const REFRESH_COOKIE = `${APP_NAME}_refresh`;
const IS_PROD = process.env.NODE_ENV === 'production';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const accessMaxAge = parseInt(process.env.JWT_COOKIE_MAX_AGE_MS ?? '900000', 10);
  const refreshMaxAge = parseInt(process.env.REFRESH_TOKEN_TTL_MS ?? '604800000', 10);

  res.cookie(AUTH_COOKIE, accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: accessMaxAge,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/auth/refresh',
    maxAge: refreshMaxAge,
  });
}

export const githubAuth: RequestHandler = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res
      .status(httpStatusCodes.INTERNAL_SERVER_ERROR)
      .json(createResponse(httpStatusCodes.INTERNAL_SERVER_ERROR, 'GitHub OAuth not configured', undefined, 'OAUTH_NOT_CONFIGURED'));
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');

  res.cookie(GITHUB_STATE_COOKIE, state, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'none',
    maxAge: 5 * 60 * 1000,
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: process.env.GITHUB_REDIRECT_URI ?? '',
    scope: 'read:user user:email',
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
};

export async function githubCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stateParam = req.query['state'];
    const stateCookie = req.cookies?.[GITHUB_STATE_COOKIE] as string | undefined;

    res.clearCookie(GITHUB_STATE_COOKIE, { path: '/' });

    if (
      !stateParam ||
      typeof stateParam !== 'string' ||
      !stateCookie ||
      stateParam !== stateCookie
    ) {
      throw AppError.forbidden('Invalid OAuth state', 'AUTH_OAUTH_STATE_MISMATCH');
    }

    if (req.query['error']) {
      const desc = req.query['error_description'];
      throw AppError.unauthorized(
        typeof desc === 'string' ? desc : 'GitHub authorization denied',
        'AUTH_GITHUB_DENIED',
      );
    }

    const code = req.query['code'];
    if (!code || typeof code !== 'string') {
      throw AppError.badRequest('Missing authorization code', 'AUTH_MISSING_CODE');
    }

    const result = await githubLoginUseCase.execute(code);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl) {
      const redirectUrl = new URL(frontendUrl);
      redirectUrl.searchParams.set('refresh_token', result.refreshToken);
      res.redirect(redirectUrl.toString());
      return;
    }

    res.status(httpStatusCodes.OK).json(
      createResponse(httpStatusCodes.OK, 'GitHub login successful', {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }),
    );
  } catch (err) {
    next(err);
  }
}
