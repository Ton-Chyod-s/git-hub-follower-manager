interface GitHubUser {
  Followers: number;
  Following: number;
  Bio: string | null;
  PublicRepos: number;
  CreatedAt: string;
  Name: string | null;
}

export type { GitHubUser };
