import { db } from "$lib/db";
import { fetchEmojis } from "$lib/forges/github";

import hljs from "highlight.js";
import { marked } from "marked";
import markedAlert from "marked-alert";
import { markedEmoji } from "marked-emoji";
import { markedHighlight } from "marked-highlight";

const renderer = new marked.Renderer();
renderer.link = function (token) {
	const rendered = marked.Renderer.prototype.link.call(this, token);
	return rendered.replace("<a", `<a target="_blank" `);
};
marked.use({ renderer });
marked.use(markedAlert());
(async () => {
	marked.use(
		markedEmoji({
			emojis: await fetchEmojis(
				await db.authorisedApps
					.where({ forge: "github" })
					.first()
					.then((app) => app?.accessToken ?? ""),
			),
			renderer: (token) =>
				`<img alt="${token.emoji}" src="${token.emoji}" style="display: inline; width: 1.2em; height: 1.2em; margin: 0; vertical-align: text-bottom;" />`,
		}),
	);
})();
marked.use(
	markedHighlight({
		emptyLangClass: "hljs",
		langPrefix: "hljs language-",
		highlight(code, lang) {
			const language = hljs.getLanguage(lang) ? lang : "plaintext";
			return hljs.highlight(code, { language }).value;
		},
	}),
);

const forgeItemLink = {
	name: "forgeItemLink",
	level: "inline" as "inline", // TypeScript
	start(src: string) {
		return src.match(
			/^(?:(?:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#)|(?:GH-)|#)(\d+)$/,
		)?.index;
	},
	tokenizer(src: string) {
		const match =
			/^(?:(?:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#)|(?:GH-)|#)(\d+)$/.exec(
				src,
			);
		if (match) {
			const [raw, owner, repo, number] = match;
			return { type: "forgeItemLink", raw, owner, repo, number };
		}
	},
	renderer(token: {
		raw: string;
		owner?: string;
		repo?: string;
		number: string;
	}) {
		// @ts-expect-error
		const community = this.parser.options.community;
		if (!community || community.forge !== "github") return token.raw;

		const repoSlug =
			token.owner && token.repo
				? `${token.owner}/${token.repo}`
				: community.path;

		const url: string = `https://github.com/${repoSlug}/issues/${token.number}`;
		const label =
			token.owner && token.repo
				? `${token.owner}/${token.repo}#${token.number}`
				: `#${token.number}`;

		return `<a href="${url}">${label}</a>`;
	},
};
marked.use({ extensions: [forgeItemLink] });

export { marked };
