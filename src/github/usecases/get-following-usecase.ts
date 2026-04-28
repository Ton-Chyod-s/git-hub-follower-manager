import { fetchUserFollowData } from './fetch-user-follow-data-usecase';

export async function getFollowing(userName: string): Promise<string[] | null> {
  const data = await fetchUserFollowData(userName);
  if (!data) return null;
  return Array.from(data.following);
}
