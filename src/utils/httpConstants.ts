export const errorMessages = {
  GENERAL: {
    SUCCESS: 'Operation completed successfully',
    UNEXPECTED_ERROR: 'Unexpected error',
    INVALID_INPUT: 'Invalid input data',
    SERVER_ERROR: 'Internal server error',
  },
  GITHUB: {
    USER_NOT_FOUND: 'GitHub user not found',
    API_ERROR: 'GitHub API error',
    KEY_NOT_SET: 'GitHub token not configured',
    USER_NOT_SET: 'GitHub user not configured',
  },
} as const;

export const httpStatusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
