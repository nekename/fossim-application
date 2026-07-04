import { fetchClientId } from "./backend";
import { db } from "./db";
import { t } from "./i18n";

import { get } from "svelte/store";

function unsupportedForgeError(forge: string) {
	return new Error(
		get(t)("communities.unsupported_forge", {
			forge,
			supported: "GitHub",
		}),
	);
}

export interface Community {
	forge: string;
	path: string;
}

export async function parseCommunityUrl(
	communityUrl: string,
): Promise<Community> {
	if (!communityUrl) {
		throw new Error(get(t)("communities.no_url_provided"));
	}

	const url = new URL(communityUrl);
	const forge = url.hostname.split(".")[0];

	if (forge === "github") {
		return { forge, path: url.pathname.split("/").slice(1, 3).join("/") };
	}

	throw unsupportedForgeError(forge);
}

let cachedCommunityHosts: Record<string, string> = {};
export async function fetchCommunityHost({
	forge,
	path,
}: Community): Promise<string> {
	if (cachedCommunityHosts[`${forge}/${path}`]) {
		return cachedCommunityHosts[`${forge}/${path}`];
	}

	const urls = [];
	if (forge === "github") {
		urls.push(`https://raw.githubusercontent.com/${path}/main/.fossim.json`);
		urls.push(`https://raw.githubusercontent.com/${path}/master/.fossim.json`);
	} else {
		throw unsupportedForgeError(forge);
	}

	for (const url of urls) {
		const response = await fetch(url);
		if (response.ok) {
			const data = await response.json();
			if (data && data.host) {
				cachedCommunityHosts[`${forge}/${path}`] = data.host;
				return data.host;
			}
		}
	}

	throw new Error(get(t)("communities.could_not_fetch_host"));
}

export async function leaveCommunity(community: Community): Promise<void> {
	const host = await fetchCommunityHost(community);
	const clientId = await fetchClientId(host, community.forge);

	await db.communities.delete([community.forge, community.path]);

	for (const otherCommunity of await db.communities
		.where("forge")
		.equals(community.forge)
		.toArray()) {
		if ((await fetchCommunityHost(otherCommunity)) === host) {
			return;
		}
	}

	await db.authorisedApps.delete([community.forge, clientId!]);
}

async function getAccessToken(community: Community): Promise<string> {
	const host = await fetchCommunityHost(community);
	const clientId = await fetchClientId(host, community.forge);

	const accessToken = (
		await db.authorisedApps.get({ forge: community.forge, clientId })
	)?.accessToken;

	if (!accessToken) {
		throw new Error(get(t)("communities.no_access_token"));
	}

	return accessToken;
}

export interface Comment {
	id: string;
	author: { login: string };
	body: string;
	replies?: { totalCount: number };
	isAnswer?: boolean;
	minimizedReason?: string | null;
	publishedAt: string;
	includesCreatedEdit: boolean;
	reactionGroups: {
		content: string;
		createdAt: string | null;
		viewerHasReacted: boolean;
	}[];
}

export interface Channel extends Comment {
	title: string;
	locked: boolean;
	url: string;
}

export interface Thread extends Channel {
	isAnswered: boolean;
	category: { id: string; name: string; isAnswerable: boolean };
}

export async function fetchChannels(community: Community): Promise<Channel[]> {
	const accessToken = await getAccessToken(community);

	if (community.forge === "github") {
		const { fetchChannels } = await import("./forges/github");
		return await fetchChannels(accessToken, community.path);
	} else {
		throw unsupportedForgeError(community.forge);
	}
}

export async function fetchThreads(
	community: Community,
	after?: string,
): Promise<{
	threads: Thread[];
	hasNextPage: boolean;
	endCursor: string | null;
}> {
	const accessToken = await getAccessToken(community);

	if (community.forge === "github") {
		const { fetchThreads } = await import("./forges/github");
		return await fetchThreads(accessToken, community.path, after);
	} else {
		throw unsupportedForgeError(community.forge);
	}
}

export async function fetchComments(
	community: Community,
	channelId: string,
	before?: string,
): Promise<{
	comments: Comment[];
	hasPreviousPage: boolean;
	startCursor: string | null;
}> {
	const accessToken = await getAccessToken(community);

	if (community.forge === "github") {
		const { fetchComments } = await import("./forges/github");
		return await fetchComments(accessToken, channelId, before);
	} else {
		throw unsupportedForgeError(community.forge);
	}
}

export async function fetchReplies(
	community: Community,
	commentId: string,
	before?: string,
): Promise<{
	comments: Comment[];
	hasPreviousPage: boolean;
	startCursor: string | null;
}> {
	const accessToken = await getAccessToken(community);

	if (community.forge === "github") {
		const { fetchReplies } = await import("./forges/github");
		return await fetchReplies(accessToken, commentId, before);
	} else {
		throw unsupportedForgeError(community.forge);
	}
}
