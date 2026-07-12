import { type Channel, type Comment, type Thread } from "../communities";
import { t } from "../i18n";

import { graphql, type GraphQlQueryResponseData } from "@octokit/graphql";
import { get } from "svelte/store";

const cachedChannelCategories: Record<string, any> = {};
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

export async function isChannel(
	accessToken: string,
	path: string,
	categoryId: string,
): Promise<boolean> {
	return categoryId === (await fetchChannelCategoryId(accessToken, path));
}

const fundingPlatformMap: Record<string, string> = {
	BUY_ME_A_COFFEE: "Buy Me a Coffee",
	COMMUNITY_BRIDGE: "Community Bridge",
	CUSTOM: "Custom",
	GITHUB: "GitHub",
	ISSUEHUNT: "IssueHunt",
	KO_FI: "Ko-fi",
	LFX_CROWDFUNDING: "LFX Crowdfunding",
	LIBERAPAY: "Liberapay",
	OPEN_COLLECTIVE: "Open Collective",
	PATREON: "Patreon",
	POLAR: "Polar",
	THANKS_DEV: "thanks.dev",
	TIDELIFT: "Tidelift",
};

// Repository funding links are also returned by this function in order to minimise GraphQL API points used.
export async function fetchChannels(
	accessToken: string,
	path: string,
): Promise<{
	fundingLinks: { url: string; platform: string }[];
	channels: Channel[];
}> {
	const [owner, repo] = path.split("/");

	const categoryId = await fetchChannelCategoryId(accessToken, path);
	const discussionsRes: GraphQlQueryResponseData = await graphql(
		`
			query ($owner: String!, $repo: String!, $categoryId: ID!) {
				repository(owner: $owner, name: $repo) {
					fundingLinks {
						url
						platform
					}
					discussions(first: 100, categoryId: $categoryId) {
						nodes {
							id
							title
							locked
							url
							author {
								login
							}
							body
							publishedAt
							includesCreatedEdit
							reactionGroups {
								content
								createdAt
								viewerHasReacted
							}
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

	return {
		fundingLinks: (discussionsRes.repository?.fundingLinks || []).map(
			(link: any) => ({
				url: link.url,
				platform:
					fundingPlatformMap[link.platform] ??
					link.platform
						.replace("_", " ")
						.replace(
							/\w\S*/g,
							(text: string) =>
								text.charAt(0).toUpperCase() + text.substring(1).toLowerCase(),
						),
			}),
		),
		channels: (discussionsRes.repository?.discussions?.nodes || []).sort(
			(a: any, b: any) => a.title.localeCompare(b.title),
		),
	};
}

export async function fetchThreads(
	accessToken: string,
	path: string,
	after?: string,
): Promise<{
	threads: Thread[];
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
							url
							isAnswered
							category {
								id
								name
								isAnswerable
							}
							author {
								login
							}
							body
							publishedAt
							includesCreatedEdit
							reactionGroups {
								content
								createdAt
								viewerHasReacted
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

export async function fetchComments(
	accessToken: string,
	channelId: string,
	before?: string,
): Promise<{
	comments: Comment[];
	hasPreviousPage: boolean;
	startCursor: string | null;
}> {
	const commentsRes: GraphQlQueryResponseData = await graphql(
		`
			query ($channelId: ID!, $before: String) {
				node(id: $channelId) {
					... on Discussion {
						comments(last: 100, before: $before) {
							nodes {
								id
								author {
									login
								}
								body
								replies {
									totalCount
								}
								isAnswer
								minimizedReason
								publishedAt
								includesCreatedEdit
								reactionGroups {
									content
									createdAt
									viewerHasReacted
								}
								viewerCanDelete
								viewerCanUpdate
								viewerCanReact
							}
							pageInfo {
								hasPreviousPage
								startCursor
							}
						}
					}
				}
			}
		`,
		{
			channelId,
			before,
			headers: { authorization: `token ${accessToken}` },
		},
	);

	return {
		comments: commentsRes.node?.comments?.nodes || [],
		hasPreviousPage:
			commentsRes.node?.comments?.pageInfo?.hasPreviousPage || false,
		startCursor: commentsRes.node?.comments?.pageInfo?.startCursor || null,
	};
}

export async function fetchReplies(
	accessToken: string,
	commentId: string,
	before?: string,
): Promise<{
	comments: Comment[];
	hasPreviousPage: boolean;
	startCursor: string | null;
}> {
	const repliesRes: GraphQlQueryResponseData = await graphql(
		`
			query ($commentId: ID!, $before: String) {
				node(id: $commentId) {
					... on DiscussionComment {
						replies(last: 100, before: $before) {
							nodes {
								id
								author {
									login
								}
								body
								replies {
									totalCount
								}
								isAnswer
								minimizedReason
								publishedAt
								includesCreatedEdit
								reactionGroups {
									content
									createdAt
									viewerHasReacted
								}
								viewerCanDelete
								viewerCanUpdate
								viewerCanReact
							}
							pageInfo {
								hasPreviousPage
								startCursor
							}
						}
					}
				}
			}
		`,
		{
			commentId,
			before,
			headers: { authorization: `token ${accessToken}` },
		},
	);

	return {
		comments: repliesRes.node?.replies?.nodes || [],
		hasPreviousPage:
			repliesRes.node?.replies?.pageInfo?.hasPreviousPage || false,
		startCursor: repliesRes.node?.replies?.pageInfo?.startCursor || null,
	};
}

export async function postComment(
	accessToken: string,
	channelId: string,
	body: string,
): Promise<string> {
	const postCommentRes: GraphQlQueryResponseData = await graphql(
		`
			mutation ($channelId: ID!, $body: String!) {
				addDiscussionComment(input: { discussionId: $channelId, body: $body }) {
					comment {
						id
					}
				}
			}
		`,
		{
			channelId,
			body,
			headers: { authorization: `token ${accessToken}` },
		},
	);

	return postCommentRes.addDiscussionComment.comment.id;
}

export async function postReply(
	accessToken: string,
	channelId: string,
	commentId: string,
	body: string,
): Promise<string> {
	const postReplyRes: GraphQlQueryResponseData = await graphql(
		`
			mutation ($channelId: ID!, $commentId: ID!, $body: String!) {
				addDiscussionComment(
					input: {
						discussionId: $channelId
						replyToId: $commentId
						body: $body
					}
				) {
					comment {
						id
					}
				}
			}
		`,
		{
			channelId,
			commentId,
			body,
			headers: { authorization: `token ${accessToken}` },
		},
	);

	return postReplyRes.addDiscussionComment.comment.id;
}

export async function editComment(
	accessToken: string,
	commentId: string,
	body: string,
): Promise<void> {
	await graphql(
		`
			mutation ($commentId: ID!, $body: String!) {
				updateDiscussionComment(input: { commentId: $commentId, body: $body }) {
					clientMutationId
				}
			}
		`,
		{
			commentId,
			body,
			headers: { authorization: `token ${accessToken}` },
		},
	);
}

export async function deleteComment(
	accessToken: string,
	commentId: string,
): Promise<void> {
	await graphql(
		`
			mutation ($commentId: ID!) {
				deleteDiscussionComment(input: { id: $commentId }) {
					clientMutationId
				}
			}
		`,
		{
			commentId,
			headers: { authorization: `token ${accessToken}` },
		},
	);
}

export async function addReaction(
	accessToken: string,
	commentId: string,
	reaction: string,
): Promise<
	{ content: string; createdAt: string | null; viewerHasReacted: boolean }[]
> {
	const reactToCommentRes: GraphQlQueryResponseData = await graphql(
		`
			mutation ($commentId: ID!, $reaction: ReactionContent!) {
				addReaction(input: { subjectId: $commentId, content: $reaction }) {
					reactionGroups {
						content
						createdAt
						viewerHasReacted
					}
				}
			}
		`,
		{
			commentId,
			reaction,
			headers: { authorization: `token ${accessToken}` },
		},
	);

	return reactToCommentRes.addReaction.reactionGroups;
}

export async function removeReaction(
	accessToken: string,
	commentId: string,
	reaction: string,
): Promise<
	{ content: string; createdAt: string | null; viewerHasReacted: boolean }[]
> {
	const removeReactionRes: GraphQlQueryResponseData = await graphql(
		`
			mutation ($commentId: ID!, $reaction: ReactionContent!) {
				removeReaction(input: { subjectId: $commentId, content: $reaction }) {
					reactionGroups {
						content
						createdAt
						viewerHasReacted
					}
				}
			}
		`,
		{
			commentId,
			reaction,
			headers: { authorization: `token ${accessToken}` },
		},
	);

	return removeReactionRes.removeReaction.reactionGroups;
}

let emojis: Record<string, string> | null = null;
export async function fetchEmojis(
	accessToken?: string,
): Promise<Record<string, string>> {
	if (emojis) return emojis;
	const emojisRes = await fetch("https://api.github.com/emojis", {
		headers: accessToken ? { authorization: `token ${accessToken}` } : {},
	});
	if (!emojisRes.ok) return {};
	emojis = await emojisRes.json();
	return emojis!;
}
