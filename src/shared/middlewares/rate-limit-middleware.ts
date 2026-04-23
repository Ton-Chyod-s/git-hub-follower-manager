import rateLimit from 'express-rate-limit';
import { createResponse } from '../../utils/create-response';
import { httpStatusCodes } from '../../utils/http-constants';

export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const status = httpStatusCodes.TOO_MANY_REQUESTS;
    return res
      .status(status)
      .json(
        createResponse(
          status,
          'Too many requests, please try again later',
          undefined,
          'RATE_LIMIT_EXCEEDED',
        ),
      );
  },
});
