<script lang="ts">
	import CommentComponent from "$lib/components/Comment.svelte";

	import {
		fetchComments,
		fetchEmojis,
		type Channel,
		type Comment,
		type Community,
	} from "$lib/communities";
	import { t } from "$lib/i18n";

	import hljs from "highlight.js";
	import { Marked } from "marked";
	import markedAlert from "marked-alert";
	import { markedEmoji } from "marked-emoji";
	import { markedHighlight } from "marked-highlight";
	import ArrowSquareOutIcon from "phosphor-svelte/lib/ArrowSquareOutIcon";
	import { onMount } from "svelte";
	import { inview } from "svelte-inview";

	let {
		community,
		channel,
		show,
	}: {
		community: Community;
		channel: Channel;
		show: boolean;
	} = $props();

	let comments: Comment[] | null = $state(null);
	let commentsHasPreviousPage: boolean | null = $state(null);
	let commentsStartCursor: string | null = $state(null);

	const marked = new Marked();
	onMount(async () => {
		const renderer = new marked.Renderer();
		renderer.link = function (token) {
			const rendered = marked.Renderer.prototype.link.call(this, token);
			return rendered.replace("<a", `<a target="_blank" `);
		};
		marked.use({ renderer });
		marked.use(markedAlert());
		marked.use(
			markedEmoji({
				emojis: await fetchEmojis(community),
				renderer: (token) =>
					`<img alt="${token.emoji}" src="${token.emoji}" style="display: inline; width: 1.2em; height: 1.2em; margin: 0; vertical-align: text-bottom;" />`,
			}),
		);
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
	});

	$effect(() => {
		if (!comments && show) {
			comments = [];
			fetchComments(community, channel.id).then(
				({ comments: fetchedComments, hasPreviousPage, startCursor }) => {
					comments = fetchedComments;
					commentsHasPreviousPage = hasPreviousPage;
					commentsStartCursor = startCursor;
				},
			);
		}
	});

	async function loadMoreComments() {
		if (!commentsStartCursor) return;
		const {
			comments: fetchedComments,
			hasPreviousPage,
			startCursor,
		} = await fetchComments(community, channel.id, commentsStartCursor);
		comments = [...fetchedComments, ...(comments || [])];
		commentsHasPreviousPage = hasPreviousPage;
		commentsStartCursor = startCursor;
	}
</script>

{#if show}
	<div class="flex h-screen w-full flex-col">
		<div
			class="bg-base-100 border-base-300 flex flex-row items-center justify-between border-b px-5 py-2.5 text-lg font-semibold"
		>
			<span>{channel.title}</span>
			<button
				onclick={() => window.open(channel.url)}
				class="btn btn-ghost btn-square"
				title={$t("message_list.open_in_browser")}
			>
				<ArrowSquareOutIcon class="size-4.5" />
			</button>
		</div>

		<div
			class="bg-base-100 flex h-full flex-col-reverse gap-4 overflow-scroll p-4"
		>
			{#if !comments?.length}
				<div class="flex h-full items-center justify-center">
					<span class="loading loading-ring loading-xl"></span>
				</div>
			{:else}
				{#each (commentsHasPreviousPage ? [] : [channel as Comment])
					.concat(comments)
					.reverse() as comment (comment.id)}
					<CommentComponent {comment} {marked} />
				{/each}

				{#if commentsHasPreviousPage}
					<div
						use:inview
						oninview_enter={loadMoreComments}
						class="my-4 flex items-center justify-center"
					>
						<span class="loading loading-ring loading-lg"></span>
						<span class="text-base-content/50 ml-2 text-sm">
							{$t("message_list.loading_more_comments")}
						</span>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}
