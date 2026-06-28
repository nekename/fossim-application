import { t } from "./i18n";

import { get } from "svelte/store";

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

	throw new Error(
		get(t)("communities.unsupported_forge", { forge, supported: "GitHub" }),
	);
}

export async function fetchCommunityHost(
	communityUrl: string,
): Promise<string> {
	const { forge, path } = await parseCommunityUrl(communityUrl);

	const urls = [];
	if (forge === "github") {
		urls.push(`https://raw.githubusercontent.com/${path}/main/.fossim.json`);
		urls.push(`https://raw.githubusercontent.com/${path}/master/.fossim.json`);
	} else {
		throw new Error(
			get(t)("communities.unsupported_forge", { forge, supported: "GitHub" }),
		);
	}

	for (const url of urls) {
		const response = await fetch(url);
		if (response.ok) {
			const data = await response.json();
			if (data && data.host) {
				return data.host;
			}
		}
	}

	throw new Error(get(t)("communities.could_not_fetch_host"));
}
