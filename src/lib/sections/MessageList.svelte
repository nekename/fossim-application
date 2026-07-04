<script lang="ts">
	import CommentComponent from "$lib/components/Comment.svelte";

	import {
		fetchComments,
		fetchReplies,
		type Channel,
		type Comment,
		type Community,
	} from "$lib/communities";
	import { t } from "$lib/i18n";

	import ArrowSquareOutIcon from "phosphor-svelte/lib/ArrowSquareOutIcon";
	import XCircleIcon from "phosphor-svelte/lib/XCircleIcon";
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

	let replies: Record<string, Comment[]> = $state({});
	let repliesHasPreviousPage: Record<string, boolean> = $state({});
	let repliesStartCursor: Record<string, string | null> = $state({});

	let openReplyComment: Comment | null = $state(null);
	$effect(() => {
		if (openReplyComment && !replies[openReplyComment.id]) {
			replies[openReplyComment.id] = [];
			fetchReplies(community, openReplyComment.id).then(
				({ comments: fetchedReplies, hasPreviousPage, startCursor }) => {
					replies[openReplyComment!.id] = fetchedReplies;
					repliesHasPreviousPage[openReplyComment!.id] = hasPreviousPage;
					repliesStartCursor[openReplyComment!.id] = startCursor;
				},
			);
		}
	});

	async function loadMoreReplies(commentId: string) {
		if (!repliesStartCursor[commentId]) return;
		const {
			comments: fetchedReplies,
			hasPreviousPage,
			startCursor,
		} = await fetchReplies(community, commentId, repliesStartCursor[commentId]);
		replies[commentId] = [...fetchedReplies, ...(replies[commentId] || [])];
		repliesHasPreviousPage[commentId] = hasPreviousPage;
		repliesStartCursor[commentId] = startCursor;
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
					<CommentComponent
						{comment}
						showReplies={true}
						onViewReplies={() => (openReplyComment = comment)}
					/>
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

	{#if openReplyComment}
		<div class="border-base-300 flex h-screen w-lg min-w-lg flex-col border-l">
			<div
				class="bg-base-100 border-base-300 flex flex-row items-center justify-end border-b px-5 py-2.5 text-lg font-semibold"
			>
				<button
					onclick={() => (openReplyComment = null)}
					class="btn btn-ghost btn-square"
					title={$t("dialog.close")}
				>
					<XCircleIcon class="size-4.5" />
				</button>
			</div>

			<div
				class="bg-base-100 flex h-full flex-col-reverse gap-4 overflow-scroll p-4"
			>
				{#if !replies[openReplyComment.id]?.length}
					<div class="flex h-full items-center justify-center">
						<span class="loading loading-ring loading-xl"></span>
					</div>
				{:else}
					{#each (repliesHasPreviousPage[openReplyComment.id] ? [] : [openReplyComment])
						.concat(replies[openReplyComment.id])
						.reverse() as reply (reply.id)}
						<CommentComponent comment={reply} showReplies={false} />
					{/each}

					{#if repliesHasPreviousPage[openReplyComment.id]}
						<div
							use:inview
							oninview_enter={() => loadMoreReplies(openReplyComment!.id)}
							class="my-4 flex items-center justify-center"
						>
							<span class="loading loading-ring loading-lg"></span>
							<span class="text-base-content/50 ml-2 text-sm">
								{$t("message_list.loading_more_replies")}
							</span>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
{/if}
