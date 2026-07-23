<script lang="ts">
	import CommentComponent from "$lib/components/Comment.svelte";
	import MessageBox from "$lib/components/MessageBox.svelte";

	import { type CommentUpdate } from "$lib/backend";
	import {
		addReaction,
		deleteComment,
		editComment,
		fetchComments,
		fetchReplies,
		postComment,
		postReply,
		removeReaction,
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
		eventTarget,
		show,
	}: {
		community: Community;
		channel: Channel;
		eventTarget: EventTarget;
		show: boolean;
	} = $props();

	let comments: Comment[] | null = $state(null);
	let commentsHasPreviousPage: boolean | null = $state(null);
	let commentsStartCursor: string | null = $state(null);

	let pendingSentComments: string[] = $state([]);

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

			eventTarget.addEventListener(`channel-${channel.id}`, (e) => {
				const { update }: { update: string } = (e as CustomEvent).detail;

				if (update === "refresh" && comments) {
					fetchComments(community, channel.id).then(
						({ comments: fetchedComments, hasPreviousPage, startCursor }) => {
							comments = fetchedComments;
							commentsHasPreviousPage = hasPreviousPage;
							commentsStartCursor = startCursor;

							replies = {};
							repliesHasPreviousPage = {};
							repliesStartCursor = {};
						},
					);
				}
			});

			eventTarget.addEventListener(`comment-${channel.id}`, (e) => {
				const {
					update,
					comment,
					parentId,
				}: { update: CommentUpdate; comment: Comment; parentId: string } = (
					e as CustomEvent
				).detail;

				if (update === "created") {
					comment.viewerCanReact = !channel.locked;
					if (pendingSentComments.includes(comment.id)) {
						pendingSentComments = pendingSentComments.filter(
							(id) => id !== comment.id,
						);
						comment.viewerCanDelete = true;
						comment.viewerCanUpdate = true;
					}

					if (parentId) {
						const parent = comments!.find((c) => c.id === parentId);
						if (parent) parent.replies!.totalCount++;
						if (!replies[parentId]) return;
						replies[parentId].push(comment);
					} else {
						comments!.push(comment);
					}
				} else if (update === "deleted") {
					delete replies[comment.id];
					delete repliesHasPreviousPage[comment.id];
					delete repliesStartCursor[comment.id];

					if (parentId) {
						const parent = comments!.find((c) => c.id === parentId);
						if (parent) {
							parent.replies!.totalCount--;
							if (parent.body === "" && parent.replies!.totalCount === 0) {
								if (openReplyComment?.id === parentId) openReplyComment = null;
								delete replies[parentId];
								delete repliesHasPreviousPage[parentId];
								delete repliesStartCursor[parentId];
								comments = comments!.filter((c) => c.id !== parentId);
							}
						}

						if (!replies[parentId]) return;
						replies[parentId] = replies[parentId].filter(
							(c) => c.id !== comment.id,
						);
					} else if (comment.replies?.totalCount) {
						const index = comments!.findIndex((c) => c.id === comment.id);
						if (index !== undefined && index !== -1) {
							comments![index].body = "";
							if (comments![index].isAnswer) comments![index].isAnswer = false;
							if (comments![index].viewerCanDelete)
								comments![index].viewerCanDelete = false;
						}
					} else {
						comments = comments!.filter((c) => c.id !== comment.id);
					}
				} else if (update === "edited") {
					if (parentId) {
						if (!replies[parentId]) return;
						const index = replies[parentId].findIndex(
							(c) => c.id === comment.id,
						);
						if (index !== undefined && index !== -1) {
							replies[parentId][index].body = comment.body;
							replies[parentId][index].includesCreatedEdit = true;
						}
					} else {
						const index = comments!.findIndex((c) => c.id === comment.id);
						if (index !== undefined && index !== -1) {
							comments![index].body = comment.body;
							comments![index].includesCreatedEdit = true;
						}
					}
				} else if (update === "becameAnswer" || update === "noLongerAnswer") {
					const isAnswer = update === "becameAnswer";
					if (parentId) {
						if (!replies[parentId]) return;
						const index = replies[parentId].findIndex(
							(c) => c.id === comment.id,
						);
						if (index !== undefined && index !== -1) {
							replies[parentId][index].isAnswer = isAnswer;
						}
					} else {
						const index = comments!.findIndex((c) => c.id === comment.id);
						if (index !== undefined && index !== -1) {
							comments![index].isAnswer = isAnswer;
						}
					}
				}
			});
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
			{#if comments === null || commentsHasPreviousPage === null}
				<div class="flex h-full items-center justify-center">
					<span class="loading loading-ring loading-xl"></span>
				</div>
			{:else}
				{#each (commentsHasPreviousPage ? [] : [channel as Comment])
					.concat(comments)
					.reverse() as comment (comment.id)}
					<CommentComponent
						{community}
						{comment}
						showReplies={true}
						canReply={!channel.locked}
						onViewReplies={() => (openReplyComment = comment)}
						onDelete={async () => await deleteComment(community, comment.id)}
						onEdit={async (newText) =>
							await editComment(community, comment.id, newText)}
						onReply={() => (openReplyComment = comment)}
						onReact={async (reaction) => {
							comment.reactionGroups = await addReaction(
								community,
								comment.id,
								reaction,
							);
						}}
						onUnreact={async (reaction) => {
							comment.reactionGroups = await removeReaction(
								community,
								comment.id,
								reaction,
							);
						}}
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

		{#if !channel.locked && comments !== null && commentsHasPreviousPage !== null}
			<MessageBox
				onSubmit={async (text) =>
					pendingSentComments.push(
						await postComment(community, channel.id, text),
					)}
			/>
		{/if}
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
				{#if replies[openReplyComment.id] === undefined || replies[openReplyComment.id] === null || repliesHasPreviousPage[openReplyComment.id] === undefined || repliesHasPreviousPage[openReplyComment.id] === null}
					<div class="flex h-full items-center justify-center">
						<span class="loading loading-ring loading-xl"></span>
					</div>
				{:else}
					{#each (repliesHasPreviousPage[openReplyComment.id] ? [] : [openReplyComment])
						.concat(replies[openReplyComment.id])
						.reverse() as reply (reply.id)}
						<CommentComponent
							{community}
							comment={reply}
							showReplies={false}
							canReply={false}
							onDelete={async () => await deleteComment(community, reply.id)}
							onEdit={async (newText) =>
								await editComment(community, reply.id, newText)}
							onReact={async (reaction) => {
								reply.reactionGroups = await addReaction(
									community,
									reply.id,
									reaction,
								);
							}}
							onUnreact={async (reaction) => {
								reply.reactionGroups = await removeReaction(
									community,
									reply.id,
									reaction,
								);
							}}
						/>
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

			{#if !channel.locked && replies[openReplyComment.id] !== undefined && replies[openReplyComment.id] !== null && repliesHasPreviousPage[openReplyComment.id] !== undefined && repliesHasPreviousPage[openReplyComment.id] !== null}
				<MessageBox
					onSubmit={async (text) =>
						pendingSentComments.push(
							await postReply(
								community,
								channel.id,
								openReplyComment!.id,
								text,
							),
						)}
				/>
			{/if}
		</div>
	{/if}
{/if}
