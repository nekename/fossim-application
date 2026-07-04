<script lang="ts">
	import { type Comment } from "$lib/communities";
	import { t } from "$lib/i18n";
	import { marked } from "$lib/marked";

	import DOMPurify from "dompurify";
	import CheckCircleIcon from "phosphor-svelte/lib/CheckCircleIcon";
	import WarningCircleIcon from "phosphor-svelte/lib/WarningCircleIcon";

	let {
		comment,
		showReplies,
		onViewReplies,
	}: {
		comment: Comment;
		showReplies: boolean;
		onViewReplies?: () => void;
	} = $props();

	function handleClick(event: MouseEvent | KeyboardEvent) {
		const link = (event.target as HTMLElement).closest("a");
		if (link && link.href) {
			event.preventDefault();
			window.open(link.href);
		}
	}
</script>

<div
	class={[
		"bg-base-200 rounded-lg p-4",
		comment.isAnswer &&
			"border-success drop-shadow-success border-2 drop-shadow-sm",
	]}
>
	<div class="mb-3 flex flex-row items-center justify-between">
		<div class="flex flex-row items-center gap-2.5">
			<img
				src={"https://avatars.githubusercontent.com/" + comment.author.login}
				alt={comment.author.login}
				class="h-6 w-6 rounded-full"
			/>
			<span class="font-semibold">{comment.author.login}</span>
		</div>

		<span class="text-base-content/50 text-sm">
			{new Date(comment.publishedAt).toLocaleString()}
			{#if comment.includesCreatedEdit}
				<span>({$t("comment.edited")})</span>
			{/if}
		</span>
	</div>

	{#if comment.isAnswer}
		<div class="mb-3 flex flex-row items-center gap-2.5">
			<span class="badge badge-success">
				<CheckCircleIcon class="h-4 w-4" />
				{$t("comment.answer")}
			</span>
		</div>
	{/if}

	{#if comment.minimizedReason}
		<details>
			<summary>
				<span class="badge badge-warning">
					<WarningCircleIcon class="h-4 w-4" />
					{$t("comment.minimized_reason", {
						reason: comment.minimizedReason.toLowerCase().replace(/_/g, " "),
					})}
				</span>
			</summary>

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="prose comment max-w-full"
				onclick={handleClick}
				onkeyup={handleClick}
			>
				{#await marked.parse(comment.body, { breaks: true }) then parsedBody}
					{@html DOMPurify.sanitize(parsedBody)}
				{/await}
			</div>
		</details>
	{:else}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="prose comment max-w-full"
			onclick={handleClick}
			onkeyup={handleClick}
		>
			{#await marked.parse(comment.body, { breaks: true }) then parsedBody}
				{@html DOMPurify.sanitize(parsedBody)}
			{/await}
		</div>
	{/if}

	<div class="flex flex-row gap-2">
		{#each comment.reactionGroups as reactionGroup (reactionGroup.content)}
			{#if reactionGroup.createdAt}
				<div
					class={[
						"bg-neutral border-base-100 mt-3 rounded-lg border px-2 py-1 text-sm",
						reactionGroup.viewerHasReacted && "bg-primary border-secondary",
					]}
				>
					{reactionGroup.content === "THUMBS_UP"
						? "👍"
						: reactionGroup.content === "THUMBS_DOWN"
							? "👎"
							: reactionGroup.content === "LAUGH"
								? "😄"
								: reactionGroup.content === "HOORAY"
									? "🎉"
									: reactionGroup.content === "CONFUSED"
										? "😕"
										: reactionGroup.content === "HEART"
											? "❤️"
											: reactionGroup.content === "ROCKET"
												? "🚀"
												: reactionGroup.content === "EYES"
													? "👀"
													: reactionGroup.content}
				</div>
			{/if}
		{/each}
	</div>

	{#if showReplies && comment.replies && comment.replies.totalCount > 0}
		<button onclick={onViewReplies} class="link link-info link-hover mt-3">
			{comment.replies.totalCount === 1
				? $t("comment.view_reply")
				: $t("comment.view_replies", {
						count: comment.replies.totalCount,
					})}
		</button>
	{/if}
</div>
