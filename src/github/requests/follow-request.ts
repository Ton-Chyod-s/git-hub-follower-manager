import * as dotenv from 'dotenv';

dotenv.config();

export async function newFollower(username: string): Promise<boolean> {
  try {
    const key = process.env.KEY;
    if (!key) {
      console.error('[newFollower] Variável KEY não configurada.');
      return false;
    }

    const response = await fetch(`https://api.github.com/user/following/${username}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      console.error(`[newFollower] Erro HTTP ${response.status} ao seguir ${username}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `[newFollower] Erro ao seguir ${username}:`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
