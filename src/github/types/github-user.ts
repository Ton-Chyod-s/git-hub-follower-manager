interface GitHubUser {
  Followers: number;
  Following: number;
  Bio: string | null;
  PublicRepos: number;
  PublicGists: number;
  CreatedAt: string;
  UpdatedAt: string;
  Name: string | null;
}

export type { GitHubUser };
