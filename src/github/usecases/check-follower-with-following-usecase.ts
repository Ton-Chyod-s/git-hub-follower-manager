import { fetchUserFollowData } from './fetch-user-follow-data-usecase';

export async function CheckFollowerWithFollowing(userName: string): Promise<string[] | null> {
  const userUnfollowed: string[] = [];

  const userFollowData = await fetchUserFollowData(userName);
  if (!userFollowData) return null;

  const following = userFollowData.following;
  const followers = userFollowData.followers;

  following.forEach((user) => {
    if (!followers.has(user)) userUnfollowed.push(user);
  });

  if (userUnfollowed.length === 0) return ['No user has unfollowed you'];

  return userUnfollowed;
}
