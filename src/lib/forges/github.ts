import { t } from "../i18n";

import { graphql, type GraphQlQueryResponseData } from "@octokit/graphql";
import { get } from "svelte/store";

let cachedChannelCategories: Record<string, any> = {};
async function fetchChannelCategoryId(accessToken: string, path: string) {
	const [owner, repo] = path.split("/");

	if (!cachedChannelCategories[path]) {
		const categoriesRes: GraphQlQueryResponseData = await graphql(
			`
				query ($owner: String!, $repo: String!) {
					repository(owner: $owner, name: $repo) {
						id
						discussionCategories(first: 25) {
							nodes {
								id
								name
							}
						}
					}
				}
			`,
			{ owner, repo, headers: { authorization: `token ${accessToken}` } },
		);

		const categories =
			categoriesRes.repository?.discussionCategories?.nodes || [];
		const channelsCategory = categories.find(
			(c: any) => c.name.toLowerCase().trim() === "channels",
		);
		if (!channelsCategory) {
			throw new Error(get(t)("forges.no_channels_category"));
		}

		cachedChannelCategories[path] = channelsCategory.id;
	}

	return cachedChannelCategories[path];
}

export async function fetchChannels(
	accessToken: string,
	path: string,
): Promise<{ id: string; title: string; locked: boolean }[]> {
	const [owner, repo] = path.split("/");

	const categoryId = await fetchChannelCategoryId(accessToken, path);
	const discussionsRes: GraphQlQueryResponseData = await graphql(
		`
			query ($owner: String!, $repo: String!, $categoryId: ID!) {
				repository(owner: $owner, name: $repo) {
					discussions(first: 100, categoryId: $categoryId) {
						nodes {
							id
							title
							locked
						}
					}
				}
			}
		`,
		{
			owner,
			repo,
			categoryId,
			headers: { authorization: `token ${accessToken}` },
		},
	);

	return (discussionsRes.repository?.discussions?.nodes || []).sort(
		(a: any, b: any) => a.title.localeCompare(b.title),
	);
}

export async function fetchThreads(
	accessToken: string,
	path: string,
	after?: string,
): Promise<{
	threads: {
		id: string;
		title: string;
		locked: boolean;
		isAnswered: boolean;
		category: { id: string; name: string; isAnswerable: boolean };
	}[];
	hasNextPage: boolean;
	endCursor: string | null;
}> {
	const [owner, repo] = path.split("/");

	const categoryId = await fetchChannelCategoryId(accessToken, path);
	const discussionsRes: GraphQlQueryResponseData = await graphql(
		`
			query ($owner: String!, $repo: String!, $after: String) {
				repository(owner: $owner, name: $repo) {
					discussions(after: $after, first: 100) {
						nodes {
							id
							title
							locked
							isAnswered
							category {
								id
								name
								isAnswerable
							}
						}
						pageInfo {
							hasNextPage
							endCursor
						}
					}
				}
			}
		`,
		{
			owner,
			repo,
			after,
			headers: { authorization: `token ${accessToken}` },
		},
	);

	return {
		threads: (discussionsRes.repository?.discussions?.nodes || []).filter(
			(d: any) => d.category?.id !== categoryId,
		),
		hasNextPage:
			discussionsRes.repository?.discussions?.pageInfo?.hasNextPage || false,
		endCursor:
			discussionsRes.repository?.discussions?.pageInfo?.endCursor || null,
	};
}
