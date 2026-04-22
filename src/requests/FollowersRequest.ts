import { FollowersData } from '../models/request/IFollowersRequest';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../config/.env') });

async function GetFollowersData(username: string, page: number): Promise<FollowersData[] | null> {
  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/followers?page=${page}&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.KEY ?? ''}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );

    if (!response.ok) {
      console.error(
        `[GetFollowersData] Erro HTTP ${response.status} ao buscar seguidores de ${username}`,
      );
      return null;
    }

    const data = await response.json();

    const followers: FollowersData[] = data.map((user: any) => ({
      Name: user.login,
    }));

    return followers;
  } catch (error) {
    console.error(
      '[GetFollowersData] Erro ao buscar seguidores:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export { GetFollowersData };
