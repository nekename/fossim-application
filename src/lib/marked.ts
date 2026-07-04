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

export { marked };
