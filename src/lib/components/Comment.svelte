<script lang="ts">
	import MessageBox from "$lib/components/MessageBox.svelte";

	import { type Comment } from "$lib/communities";
	import { t } from "$lib/i18n";
	import { marked } from "$lib/marked";

	import DOMPurify from "dompurify";
	import CheckCircleIcon from "phosphor-svelte/lib/CheckCircleIcon";
	import PencilSimpleIcon from "phosphor-svelte/lib/PencilSimpleIcon";
	import TrashSimpleIcon from "phosphor-svelte/lib/TrashSimpleIcon";
	import WarningCircleIcon from "phosphor-svelte/lib/WarningCircleIcon";

	let {
		comment,
		showReplies,
		onViewReplies,
		onDelete,
		onEdit,
	}: {
		comment: Comment;
		showReplies: boolean;
		onViewReplies?: () => void;
		onDelete: () => void;
		onEdit: (newText: string) => void;
	} = $props();

	function handleClick(event: MouseEvent | KeyboardEvent) {
		const link = (event.target as HTMLElement).closest("a");
		if (link && link.href) {
			event.preventDefault();
			window.open(link.href);
		}
	}

	let confirmDeleteOpen = $state(false);
	let editing = $state(false);
</script>

<div
	class={[
		"bg-base-200 group rounded-lg p-4",
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

		<div class="flex flex-row items-center gap-2">
			<div class="flex flex-row items-center gap-1 not-group-has-hover:hidden">
				{#if comment.viewerCanUpdate}
					<button
						onclick={() => (editing = true)}
						class="btn btn-ghost btn-square btn-xs"
						title={$t("comment.edit")}
					>
						<PencilSimpleIcon class="size-4.5" />
					</button>
				{/if}

				{#if comment.viewerCanDelete}
					<button
						onclick={() => (confirmDeleteOpen = true)}
						class="btn btn-ghost btn-square btn-xs"
						title={$t("comment.delete")}
					>
						<TrashSimpleIcon class="size-4.5" />
					</button>
				{/if}
			</div>

			<span class="text-base-content/50 text-sm">
				{new Date(comment.publishedAt).toLocaleString()}
				{#if comment.includesCreatedEdit}
					<span>({$t("comment.edited")})</span>
				{/if}
			</span>
		</div>
	</div>

	{#if comment.isAnswer}
		<div class="mb-3 flex flex-row items-center gap-2.5">
			<span class="badge badge-success">
				<CheckCircleIcon class="h-4 w-4" />
				{$t("comment.answer")}
			</span>
		</div>
	{/if}

	{#if editing}
		<MessageBox
			onSubmit={(text) => {
				editing = false;
				if (text !== comment.body) onEdit(text);
			}}
			prefilledText={comment.body}
			noPadding={true}
		/>
	{:else if comment.minimizedReason}
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
				{#await marked.parse( comment.body || `*${$t("comment.was_deleted")}*`, { breaks: true }, ) then parsedBody}
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
			{#await marked.parse( comment.body || `*${$t("comment.was_deleted")}*`, { breaks: true }, ) then parsedBody}
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

{#if confirmDeleteOpen}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{$t("comment.confirm_delete_title")}</h3>
			<p class="my-3">{$t("comment.confirm_delete_description")}</p>
			<div class="modal-action">
				<button
					onclick={() => (confirmDeleteOpen = false)}
					class="btn btn-ghost"
				>
					{$t("dialog.cancel")}
				</button>
				<button
					onclick={() => {
						onDelete();
						confirmDeleteOpen = false;
					}}
					class="btn btn-error"
				>
					{$t("comment.delete")}
				</button>
			</div>
		</div>

		<form method="dialog" class="modal-backdrop">
			<!-- Automatically close dialog when clicking outside -->
			<button onclick={() => (confirmDeleteOpen = false)}>
				{$t("dialog.cancel")}
			</button>
		</form>
	</div>
{/if}
