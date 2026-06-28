import { t } from "./i18n";

import { get } from "svelte/store";

export async function fetchCommunityHost(
	communityUrl: string,
): Promise<string> {
	if (!communityUrl) {
		throw new Error(get(t)("communities.no_url_provided"));
	}

	const url = new URL(communityUrl);
	const forge = url.hostname.split(".")[0];
	const urls = [];

	if (forge === "github") {
		urls.push(
			`https://raw.githubusercontent.com/${url.pathname.split("/").slice(1, 3).join("/")}/main/.fossim.json`,
		);
		urls.push(
			`https://raw.githubusercontent.com/${url.pathname.split("/").slice(1, 3).join("/")}/master/.fossim.json`,
		);
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
