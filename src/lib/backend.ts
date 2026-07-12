import {
	fetchCommunityConfig,
	isChannel,
	type Channel,
	type Comment,
	type Community,
	type Thread,
} from "./communities";
import { t } from "./i18n";

import { encode as msgpackEncode } from "@msgpack/msgpack";
import { get } from "svelte/store";

export async function makeApiRequest(
	host: string,
	path: string,
	method: string = "GET",
	body?: any,
): Promise<any> {
	let response;
	try {
		response = await fetch(host + path, {
			method,
			headers: body ? { "Content-Type": "application/json" } : undefined,
			body: body ? JSON.stringify(body) : undefined,
		});
	} catch (error) {
		throw new Error(
			get(t)("backend.could_not_contact_host", {
				error: error instanceof Error ? error.message : String(error),
			}),
		);
	}

	if (!response.ok) {
		let message = response.statusText;
		try {
			const json = await response.json();
			if (json && json.message) {
				message = response.statusText + ": " + json.message;
			}
		} catch {
			// If the error response is not JSON, just use the status text.
		}
		throw new Error(
			get(t)("backend.could_not_contact_host", {
				error: message,
			}),
		);
	}
	return await response.json();
}

const cachedClientIds: { [host: string]: { [forge: string]: string } } = {};
export async function fetchClientId(
	host: string,
	forge: string,
): Promise<string> {
	if (cachedClientIds[host] && cachedClientIds[host][forge]) {
		return cachedClientIds[host][forge];
	}
	const clientId = (await makeApiRequest(host, `/api/oauth/${forge}/client_id`))
		.client_id;
	cachedClientIds[host] = cachedClientIds[host] || {};
	cachedClientIds[host][forge] = clientId;
	return clientId;
}

export interface AuthorisedApp {
	forge: string;
	clientId: string;
	accessToken: string;
}

export type CommentUpdate =
	| "created"
	| "deleted"
	| "edited"
	| "becameAnswer"
	| "noLongerAnswer";

export type ChannelUpdate =
	| "created"
	| "deleted"
	| "edited"
	| "locked"
	| "unlocked";
export type ThreadUpdate = ChannelUpdate | "answered" | "unanswered";

// The casing and naming of reactions varies between the REST API format (which forwarded webhook events are received from the backend in)
// and the GraphQL API (which is relied on in the client), so it is necessary to perform a conversion.
const reactionMap: { [key: string]: string } = {
	"+1": "THUMBS_UP",
	"-1": "THUMBS_DOWN",
	laugh: "LAUGH",
	hooray: "HOORAY",
	confused: "CONFUSED",
	heart: "HEART",
	rocket: "ROCKET",
	eyes: "EYES",
};
function reactionsToReactionGroups(reactions: { [id: string]: number }): {
	content: string;
	createdAt: string | null;
}[] {
	const reactionGroups = [];

	for (const [reaction, count] of Object.entries(reactions)) {
		if (!reactionMap[reaction]) continue;
		// The current date is used as the createdAt date for present reactions, since the webhook event doesn't provide this information
		// and the client only relies on the value's existence to determine whether or not the reaction is present.
		const createdAt = count ? new Date().toISOString() : null;
		reactionGroups.push({ content: reactionMap[reaction], createdAt });
	}

	return reactionGroups;
}

// The parent_id field of a comment is only provided as a database ID in webhook events, so it is necessary to convert it to a node ID,
// which is the format tracked by the client and used in the GraphQL API. See https://gist.github.com/natanlao/afb676b17aa724754ee77099e4291f3f
const DC_VERSION = 0;
const DC_TYPE_MAGIC = 1282218899;
export function dcDatabaseIdToNodeId(databaseId: number): string {
	const bytes = msgpackEncode([DC_VERSION, DC_TYPE_MAGIC, databaseId]);
	const b64 = bytes.toBase64({ alphabet: "base64url" });
	return `DC_${b64}`;
}

export async function listenForUpdates(
	community: Community,
	onChannelUpdate: (update: ChannelUpdate, channel: Channel) => void,
	onThreadUpdate: (update: ThreadUpdate, thread: Thread) => void,
	onCommentUpdate: (
		update: CommentUpdate,
		channelId: string,
		comment: Comment,
		parentId: string | null,
	) => void,
	onDisconnect: (event: CloseEvent) => void,
): Promise<void> {
	if (community.forge !== "github") return;

	const host = new URL((await fetchCommunityConfig(community)).host).host;
	const ws = new WebSocket(
		`wss://${host}/api/events/${community.forge}/${community.path}`,
	);

	await new Promise<void>((resolve, reject) => {
		ws.onopen = () => resolve();
		ws.onerror = () =>
			reject(
				get(t)("backend.could_not_contact_host", {
					error: "WebSocket connection error",
				}),
			);
	});

	ws.onclose = (event) => {
		onDisconnect(event);
	};

	ws.onmessage = async (event) => {
		const data = JSON.parse(event.data);

		if (data.comment) {
			if (
				data.action !== "created" &&
				data.action !== "deleted" &&
				data.action !== "edited"
			)
				return;

			const comment: Comment = {
				id: data.comment.node_id,
				author: { login: data.comment.user.login },
				body: data.comment.body,
				replies: { totalCount: data.comment.child_comment_count },
				isAnswer: data.discussion.answer_html_url === data.comment.html_url,
				publishedAt: data.comment.created_at,
				includesCreatedEdit: data.action === "edited",
				reactionGroups: reactionsToReactionGroups(data.comment.reactions),
			};

			const parentId = data.comment.parent_id
				? dcDatabaseIdToNodeId(data.comment.parent_id)
				: null;

			onCommentUpdate(data.action, data.discussion.node_id, comment, parentId);
		} else if (data.discussion) {
			const notThread = await isChannel(community, {
				categoryId: data.discussion.category.node_id,
			});

			const channel: Channel = {
				id: data.discussion.node_id,
				title: data.discussion.title,
				locked: data.discussion.locked,
				url: data.discussion.html_url,
				author: { login: data.discussion.user.login },
				body: data.discussion.body,
				publishedAt: data.discussion.created_at,
				includesCreatedEdit:
					data.action === "edited" ||
					data.discussion.updated_at !== data.discussion.created_at,
				reactionGroups: reactionsToReactionGroups(data.discussion.reactions),
			};

			if (!notThread) {
				(channel as Thread).isAnswered =
					data.action === "answered"
						? true
						: data.action === "unanswered"
							? false
							: data.discussion.answer_html_url
								? true
								: false;
				(channel as Thread).category = {
					id: data.discussion.category.node_id,
					name: data.discussion.category.name,
					isAnswerable: data.discussion.category.is_answerable,
				};
			}

			if (
				data.action === "created" ||
				data.action === "deleted" ||
				data.action === "edited" ||
				data.action === "locked" ||
				data.action === "unlocked"
			) {
				if (notThread) onChannelUpdate(data.action, channel);
				else onThreadUpdate(data.action, channel as Thread);
			} else if (
				(data.action === "answered" || data.action === "unanswered") &&
				!notThread
			) {
				onThreadUpdate(data.action, channel as Thread);

				const commentData =
					data.action === "answered" ? data.answer : data.old_answer;
				const commentUpdate: CommentUpdate =
					data.action === "answered" ? "becameAnswer" : "noLongerAnswer";

				const comment: Comment = {
					id: commentData.node_id,
					author: { login: commentData.user.login },
					body: commentData.body,
					replies: { totalCount: commentData.child_comment_count },
					isAnswer: data.action === "answered",
					publishedAt: commentData.created_at,
					includesCreatedEdit:
						commentData.updated_at !== commentData.created_at,
					reactionGroups: reactionsToReactionGroups(commentData.reactions),
				};

				const parentId = commentData.parent_id
					? dcDatabaseIdToNodeId(commentData.parent_id)
					: null;

				onCommentUpdate(
					commentUpdate,
					data.discussion.node_id,
					comment,
					parentId,
				);
			}
		}
	};
}

export interface SeqCounter {
	forge: string;
	path: string;
	channelId: string;
	seqCount: number;
}

export async function fetchSeqCounters(
	community: Community,
	channelIds: string[],
): Promise<{ [channelId: string]: number }> {
	const host = (await fetchCommunityConfig(community)).host;
	return (
		await makeApiRequest(
			host,
			`/api/channels/${community.forge}/${community.path}/seq_counters`,
			"POST",
			{ channel_ids: channelIds },
		)
	).seq_counters;
}
