import { GetFollowersData } from '../requests/followers-request';
import { GetFollowingData } from '../requests/following-request';
import { getUserData } from '../requests/user-request';

const PER_PAGE = 100;

export async function fetchUserFollowData(
  userName: string,
): Promise<{ followers: Set<string>; following: Set<string> } | null> {
  try {
    const userData = await getUserData(userName);
    if (!userData) return null;

    const followersPageCount = Math.ceil((userData.Followers ?? 0) / PER_PAGE);
    const followingPageCount = Math.ceil((userData.Following ?? 0) / PER_PAGE);

    const [followerPages, followingPages] = await Promise.all([
      Promise.all(
        Array.from({ length: followersPageCount }, (_, i) => GetFollowersData(userName, i + 1)),
      ),
      Promise.all(
        Array.from({ length: followingPageCount }, (_, i) => GetFollowingData(userName, i + 1)),
      ),
    ]);

    const followers = new Set<string>();
    const following = new Set<string>();

    followerPages.forEach((page) => page?.forEach((f) => followers.add(f.Name)));
    followingPages.forEach((page) => page?.forEach((f) => following.add(f.Name)));

    return { followers, following };
  } catch (error) {
    console.error('Erro ao buscar dados de seguidores/seguidos:', error);
    return null;
  }
}
