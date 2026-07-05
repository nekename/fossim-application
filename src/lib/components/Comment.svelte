<script lang="ts">
	import MessageBox from "$lib/components/MessageBox.svelte";

	import { type Comment } from "$lib/communities";
	import { t } from "$lib/i18n";
	import { marked } from "$lib/marked";

	import DOMPurify from "dompurify";
	import ArrowBendUpLeftIcon from "phosphor-svelte/lib/ArrowBendUpLeftIcon";
	import CheckCircleIcon from "phosphor-svelte/lib/CheckCircleIcon";
	import ClipboardIcon from "phosphor-svelte/lib/ClipboardIcon";
	import PencilSimpleIcon from "phosphor-svelte/lib/PencilSimpleIcon";
	import SmileyIcon from "phosphor-svelte/lib/SmileyIcon";
	import TrashSimpleIcon from "phosphor-svelte/lib/TrashSimpleIcon";
	import WarningCircleIcon from "phosphor-svelte/lib/WarningCircleIcon";

	let {
		comment,
		showReplies,
		canReply,
		onViewReplies,
		onDelete,
		onEdit,
		onReply,
		onReact,
		onUnreact,
	}: {
		comment: Comment;
		showReplies: boolean;
		canReply: boolean;
		onViewReplies?: () => void;
		onDelete: () => void;
		onEdit: (newText: string) => void;
		onReply?: () => void;
		onReact: (reaction: string) => void;
		onUnreact: (reaction: string) => void;
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
	let reactOpen: [number, number] | null = $state(null);
	let copied = $state(false);
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
				{#if comment.viewerCanReact}
					<button
						onclick={(event) => (reactOpen = [event.clientX, event.clientY])}
						class="btn btn-ghost btn-square btn-xs"
						title={$t("comment.react")}
					>
						<SmileyIcon class="size-4.5" />
					</button>
				{/if}

				{#if canReply}
					<button
						onclick={onReply}
						class="btn btn-ghost btn-square btn-xs"
						title={$t("comment.reply")}
					>
						<ArrowBendUpLeftIcon class="size-4.5" />
					</button>
				{/if}

				{#if comment.viewerCanUpdate}
					<button
						onclick={() => (editing = true)}
						class="btn btn-ghost btn-square btn-xs"
						title={$t("comment.edit")}
					>
						<PencilSimpleIcon class="size-4.5" />
					</button>
				{/if}

				<button
					onclick={() => {
						navigator.clipboard.writeText(comment.body);
						copied = true;
						setTimeout(() => (copied = false), 2000);
					}}
					class="btn btn-ghost btn-square btn-xs"
					title={$t("comment.copy_text")}
				>
					{#if copied}
						<CheckCircleIcon class="size-4.5" />
					{:else}
						<ClipboardIcon class="size-4.5" />
					{/if}
				</button>

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
				<button
					onclick={() => {
						if (reactionGroup.viewerHasReacted) {
							onUnreact(reactionGroup.content);
						} else {
							onReact(reactionGroup.content);
						}
					}}
					class={[
						"bg-neutral border-base-100 mt-3 cursor-pointer rounded-lg border px-2 py-1 text-sm",
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
				</button>
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

{#if reactOpen}
	<dialog
		open
		class="absolute z-50"
		style={`top: ${reactOpen[1]}px; left: ${reactOpen[0]}px; transform: translate(-50%, -50%);`}
		onmouseleave={() => (reactOpen = null)}
	>
		<div class="card compact bg-base-100 shadow">
			<div class="card-body flex flex-row gap-2 p-2">
				{#each [{ emoji: "👍", content: "THUMBS_UP" }, { emoji: "👎", content: "THUMBS_DOWN" }, { emoji: "😄", content: "LAUGH" }, { emoji: "🎉", content: "HOORAY" }, { emoji: "😕", content: "CONFUSED" }, { emoji: "❤️", content: "HEART" }, { emoji: "🚀", content: "ROCKET" }, { emoji: "👀", content: "EYES" }] as reaction}
					{#if !comment.reactionGroups.find((rg) => rg.content === reaction.content)?.viewerHasReacted}
						<button
							onclick={() => {
								onReact(reaction.content);
								reactOpen = null;
							}}
							class="btn btn-ghost btn-square btn-xs"
							title={$t("comment.react_with", {
								reaction: reaction.content.toLowerCase().replace(/_/g, " "),
							})}
						>
							{reaction.emoji}
						</button>
					{/if}
				{/each}
			</div>
		</div>
	</dialog>
{/if}
