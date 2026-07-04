import { type Channel, type Comment, type Thread } from "../communities";
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
): Promise<Channel[]> {
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

	return (discussionsRes.repository?.discussions?.nodes || []).sort(
		(a: any, b: any) => a.title.localeCompare(b.title),
	);
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
): Promise<Comment> {
	const postCommentRes: GraphQlQueryResponseData = await graphql(
		`
			mutation ($channelId: ID!, $body: String!) {
				addDiscussionComment(input: { discussionId: $channelId, body: $body }) {
					comment {
						id
						author {
							login
						}
						body
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

	return postCommentRes.addDiscussionComment.comment;
}

export async function postReply(
	accessToken: string,
	channelId: string,
	commentId: string,
	body: string,
): Promise<Comment> {
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
						author {
							login
						}
						body
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

	return postReplyRes.addDiscussionComment.comment;
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
