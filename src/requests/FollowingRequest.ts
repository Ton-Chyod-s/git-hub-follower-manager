import { FollowingData } from "../models/request/IFollowingRequest";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../config/.env") });

async function GetFollowingData(username: string, page: number): Promise<FollowingData[] | null> {
    try {
        const response = await fetch(`https://api.github.com/users/${username}/following?page=${page}&per_page=100`, {
            headers: {
                Authorization: `Bearer ${process.env.KEY ?? ""}`,
                Accept: "application/vnd.github+json",
            },
        });

        if (!response.ok) {
            console.error(`[GetFollowingData] Erro HTTP ${response.status} ao buscar following de ${username}`);
            return null;
        }

        const data = await response.json();

        const following: FollowingData[] = data.map((user: any) => ({
            Name: user.login,
        }));

        return following;

    } catch (error) {
        console.error("[GetFollowingData] Erro ao buscar following:", error instanceof Error ? error.message : error);
        return null;
    }
}

export { GetFollowingData };
