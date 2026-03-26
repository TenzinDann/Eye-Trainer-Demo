import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";
const normalizedRepoName = repoName.toLowerCase();
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const isUserSite = normalizedRepoName.endsWith(".github.io");
const base = isGithubActions ? (isUserSite ? "/" : `/${normalizedRepoName}/`) : "/";

export default defineConfig({
  plugins: [react()],
  base,
});
