export type ApiResponse<T = unknown> = {
  statusCode: number;
  message: string;
  code?: string;
  data?: T;
};

export function createResponse<T>(
  statusCode: number,
  message: string,
  data?: T,
  code?: string,
): ApiResponse<T> {
  const response: ApiResponse<T> = { statusCode, message };

  if (data !== undefined) response.data = data;
  if (code !== undefined) response.code = code;

  return response;
}
