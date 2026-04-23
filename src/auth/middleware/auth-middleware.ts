import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken } from '../../utils/jwt';
import { UserRepository } from '../repositories/user-repository';
import { createResponse } from '../../utils/createResponse';
import { httpStatusCodes } from '../../utils/httpConstants';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'USER' | 'ADMIN';
        tokenVersion: number;
      };
    }
  }
}

const userRepository = new UserRepository();

function sendUnauthorized(res: Response): void {
  res
    .status(httpStatusCodes.UNAUTHORIZED)
    .json(createResponse(httpStatusCodes.UNAUTHORIZED, 'Unauthorized', undefined, 'UNAUTHORIZED'));
}

export const authMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const bearerToken = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    const cookieToken = req.cookies?.[`${process.env.APP_NAME ?? 'app'}_token`] as string | undefined;

    const token = bearerToken ?? cookieToken;
    if (!token) { sendUnauthorized(res); return; }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      sendUnauthorized(res); return;
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) { sendUnauthorized(res); return; }

    if (user.token_version !== payload.tokenVersion) {
      sendUnauthorized(res); return;
    }

    req.user = { id: user.id, role: user.role, tokenVersion: user.token_version };
    next();
  } catch {
    sendUnauthorized(res);
  }
};

export function requireRole(...roles: Array<'USER' | 'ADMIN'>): RequestHandler {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res
        .status(httpStatusCodes.FORBIDDEN)
        .json(createResponse(httpStatusCodes.FORBIDDEN, 'Forbidden', undefined, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
