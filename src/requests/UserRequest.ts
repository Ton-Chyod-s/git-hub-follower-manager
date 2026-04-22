import { GitHubUser } from '../models/request/IUserDataRequest';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../config/.env') });

async function getUserData(username: string): Promise<GitHubUser | null> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Authorization: `Bearer ${process.env.KEY ?? ''}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      console.error(`[getUserData] Erro HTTP ${response.status} ao buscar usuário ${username}`);
      return null;
    }

    const data = await response.json();

    return {
      Followers: data.followers ?? 0,
      Following: data.following ?? 0,
      Bio: data.bio ?? null,
      PublicRepos: data.public_repos ?? 0,
      CreatedAt: data.created_at ?? '',
      Name: data.name ?? null,
    };
  } catch (error) {
    console.error(
      `[getUserData] Erro ao buscar usuário ${username}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export { getUserData };
