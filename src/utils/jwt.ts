import jwt from 'jsonwebtoken';

export type TokenPayload = {
  sub: string;
  role: 'USER' | 'ADMIN';
  tokenVersion: number;
};

const ALLOWED_ROLES = new Set(['USER', 'ADMIN']);

function getJwtConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');

  return {
    secret,
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
    issuer: process.env.JWT_ISSUER ?? 'api',
    audience: process.env.JWT_AUDIENCE ?? 'client',
  };
}

export function signToken(payload: TokenPayload): string {
  const config = getJwtConfig();
  return jwt.sign(
    { role: payload.role, tokenVersion: payload.tokenVersion },
    config.secret,
    {
      subject: payload.sub,
      expiresIn: config.expiresIn,
      algorithm: 'HS256',
      issuer: config.issuer,
      audience: config.audience,
    },
  );
}

export function verifyToken(token: string): TokenPayload {
  const config = getJwtConfig();
  const decoded = jwt.verify(token, config.secret, {
    algorithms: ['HS256'],
    issuer: config.issuer,
    audience: config.audience,
  });

  if (!decoded || typeof decoded !== 'object') {
    throw new jwt.JsonWebTokenError('Invalid token');
  }

  const payload = decoded as jwt.JwtPayload;

  const sub = typeof payload.sub === 'string' ? payload.sub : String(payload.sub ?? '');
  if (!sub) throw new jwt.JsonWebTokenError('Token missing subject');

  const roleRaw = (payload as Record<string, unknown>).role;
  if (typeof roleRaw !== 'string' || !ALLOWED_ROLES.has(roleRaw)) {
    throw new jwt.JsonWebTokenError('Token has invalid role');
  }

  const tokenVersionRaw = (payload as Record<string, unknown>).tokenVersion;
  if (typeof tokenVersionRaw !== 'number' || !Number.isInteger(tokenVersionRaw)) {
    throw new jwt.JsonWebTokenError('Token has invalid tokenVersion');
  }

  return { sub, role: roleRaw as TokenPayload['role'], tokenVersion: tokenVersionRaw };
}
