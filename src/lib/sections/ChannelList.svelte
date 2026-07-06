<script lang="ts">
	import {
		fetchSeqCounters,
		listenForUpdates,
		type ChannelUpdate,
		type ThreadUpdate,
	} from "$lib/backend";
	import {
		fetchChannels,
		fetchThreads,
		leaveCommunity,
		type Channel,
		type Community,
		type Thread,
	} from "$lib/communities";
	import { db, liveQuery } from "$lib/db";
	import { t } from "$lib/i18n";

	import CheckCircleIcon from "phosphor-svelte/lib/CheckCircleIcon";
	import HashStraightIcon from "phosphor-svelte/lib/HashStraightIcon";
	import LockSimpleIcon from "phosphor-svelte/lib/LockSimpleIcon";
	import QuestionIcon from "phosphor-svelte/lib/QuestionIcon";
	import SignOutIcon from "phosphor-svelte/lib/SignOutIcon";
	import { onMount } from "svelte";

	let {
		community,
		show,
		eventTarget,
		channels = $bindable(),
		threads = $bindable(),
		selectedChannel = $bindable(),
	}: {
		community: Community;
		show: boolean;
		eventTarget: EventTarget;
		channels: Channel[] | null;
		threads: Thread[] | null;
		selectedChannel: string | null;
	} = $props();

	let errorMessage: string | null = $state(null);

	let threadsHasNextPage: boolean | null = $state(null);
	let threadsEndCursor: string | null = $state(null);

	const storedSeqCounters = liveQuery(async () => {
		const map: { [channelId: string]: number } = {};
		await db.seqCounters
			.where({ forge: community.forge, path: community.path })
			.each((r) => {
				map[r.channelId] = r.seqCount;
			});
		return map;
	});
	let currentSeqCounters: { [channelId: string]: number } | null = $state(null);

	async function initStoredSeqCounter(channelId: string, seqCount: number) {
		if (
			!(await db.seqCounters
				.where({
					forge: community.forge,
					path: community.path,
					channelId,
				})
				.first())
		) {
			// We haven't seen this channel/thread before, so we mark all existing comments as read.
			await db.seqCounters.add({
				forge: community.forge,
				path: community.path,
				channelId,
				seqCount,
			});
		}
	}

	async function handleChannelUpdate(update: ChannelUpdate, channel: Channel) {
		if (update === "created") {
			channels!.splice(
				(channels?.findLastIndex(
					(c) => c.title.localeCompare(channel.title) <= 0,
				) ?? -1) + 1,
				0,
				channel,
			);

			currentSeqCounters![channel.id] = (
				await fetchSeqCounters(community, [channel.id])
			)[channel.id];
			await initStoredSeqCounter(channel.id, currentSeqCounters![channel.id]);
		} else if (update === "deleted") {
			const index = channels?.findIndex((c) => c.id === channel.id);
			if (index !== undefined && index !== -1) channels!.splice(index, 1);

			await db.seqCounters
				.where({
					forge: community.forge,
					path: community.path,
					channelId: channel.id,
				})
				.delete();
			delete currentSeqCounters![channel.id];
		} else if (update === "edited") {
			const index = channels?.findIndex((c) => c.id === channel.id);
			if (index !== undefined && index !== -1) {
				channels![index].title = channel.title;
				channels![index].body = channel.body;
				channels![index].includesCreatedEdit = true;
			}
		} else if (update === "locked" || update === "unlocked") {
			const index = channels?.findIndex((c) => c.id === channel.id);
			if (index !== undefined && index !== -1) {
				channels![index].locked = channel.locked;
			}
		}
	}

	async function handleThreadUpdate(update: ThreadUpdate, thread: Thread) {
		if (update === "created") {
			threads!.unshift(thread);

			currentSeqCounters![thread.id] = (
				await fetchSeqCounters(community, [thread.id])
			)[thread.id];
			await initStoredSeqCounter(thread.id, currentSeqCounters![thread.id]);
		} else if (update === "deleted") {
			const index = threads?.findIndex((t) => t.id === thread.id);
			if (index !== undefined && index !== -1) threads!.splice(index, 1);

			await db.seqCounters
				.where({
					forge: community.forge,
					path: community.path,
					channelId: thread.id,
				})
				.delete();
			delete currentSeqCounters![thread.id];
		} else if (update === "edited") {
			const index = threads?.findIndex((t) => t.id === thread.id);
			if (index !== undefined && index !== -1) {
				threads![index].title = thread.title;
				threads![index].body = thread.body;
				threads![index].includesCreatedEdit = true;
			}
		} else if (update === "locked" || update === "unlocked") {
			const index = threads?.findIndex((t) => t.id === thread.id);
			if (index !== undefined && index !== -1) {
				threads![index].locked = thread.locked;
			}
		} else if (update === "answered" || update === "unanswered") {
			const index = threads?.findIndex((t) => t.id === thread.id);
			if (index !== undefined && index !== -1) {
				threads![index].isAnswered = thread.isAnswered;
			}
		}
	}

	async function listen() {
		await listenForUpdates(
			community,
			handleChannelUpdate,
			handleThreadUpdate,
			(update, channelId, comment, parentId) => {
				eventTarget.dispatchEvent(
					new CustomEvent(`comment-${channelId}`, {
						detail: { update, comment, parentId },
					}),
				);
				if (
					update === "created" &&
					parentId === null &&
					currentSeqCounters?.[channelId] !== undefined
				) {
					currentSeqCounters![channelId]++;
					if (selectedChannel === channelId) {
						db.seqCounters.put({
							forge: community.forge,
							path: community.path,
							channelId,
							seqCount: currentSeqCounters![channelId],
						});
					}
				}
			},
			async () => {
				try {
					await listen();
				} catch (error) {
					errorMessage = error instanceof Error ? error.message : String(error);
				}
			},
		);
	}

	onMount(async () => {
		try {
			channels = await fetchChannels(community);
			const threadsRes = await fetchThreads(community);
			threads = threadsRes.threads;
			threadsHasNextPage = threadsRes.hasNextPage;
			threadsEndCursor = threadsRes.endCursor;

			currentSeqCounters = await fetchSeqCounters(community, [
				...channels.map((c) => c.id),
				...threads.map((t) => t.id),
			]);
			for (const [channelId, seqCount] of Object.entries(currentSeqCounters)) {
				await initStoredSeqCounter(channelId, seqCount);
			}

			await listen();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	});

	async function selectChannel(channelId: string) {
		selectedChannel = channelId;
		if (currentSeqCounters?.[channelId] !== undefined) {
			await db.seqCounters.put({
				forge: community.forge,
				path: community.path,
				channelId,
				seqCount: currentSeqCounters[channelId],
			});
		}
	}

	async function loadMoreThreads() {
		try {
			const moreThreads = await fetchThreads(community, threadsEndCursor!);
			threads!.push(...moreThreads.threads);
			threadsHasNextPage = moreThreads.hasNextPage;
			threadsEndCursor = moreThreads.endCursor;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	}

	async function leave() {
		try {
			await leaveCommunity(community);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	}
</script>

<div
	class="bg-base-200 flex h-screen w-72 min-w-72 flex-col overflow-scroll p-4"
	class:!hidden={!show}
>
	<div class="mb-2.5 flex flex-row items-center justify-between">
		<h2 class="text-lg font-bold">
			{community.path.split("/")[1]}
		</h2>

		<button
			onclick={leave}
			class="btn btn-ghost btn-square btn-sm rotate-180"
			title={$t("channel_list.leave_community")}
		>
			<SignOutIcon class="size-5" />
		</button>
	</div>

	{#if errorMessage}
		<div class="alert alert-error my-auto">
			<span>{errorMessage}</span>
		</div>
	{:else if !channels || !threads}
		<div class="flex h-full w-full items-center justify-center">
			<span class="loading loading-ring loading-lg"></span>
		</div>
	{:else}
		<div class="divider text-secondary my-2.5 text-sm">
			{$t("channel_list.channels")}
		</div>
		{#if !channels?.length}
			<span class="text-secondary mt-2 text-sm">
				{$t("channel_list.no_channels")}
			</span>
		{:else}
			{#each channels as channel}
				<button
					onclick={() => selectChannel(channel.id)}
					class="btn btn-ghost flex w-full flex-row justify-between px-1.5"
					class:bg-primary={selectedChannel === channel.id}
				>
					<div
						class={[
							"flex w-full flex-row items-center gap-2.5",
							$storedSeqCounters &&
								currentSeqCounters &&
								$storedSeqCounters[channel.id] !== undefined &&
								currentSeqCounters[channel.id] !== undefined &&
								$storedSeqCounters[channel.id] <
									currentSeqCounters[channel.id] &&
								"w-[calc(100%-2rem)]!",
						]}
					>
						{#if channel.locked}
							<LockSimpleIcon class="size-4.5 min-w-4.5" />
						{:else}
							<HashStraightIcon class="size-4.5 min-w-4.5" />
						{/if}
						<span class="truncate font-medium">{channel.title}</span>
					</div>

					{#if $storedSeqCounters && currentSeqCounters && $storedSeqCounters[channel.id] !== undefined && currentSeqCounters[channel.id] !== undefined}
						{@const diff =
							currentSeqCounters[channel.id] - $storedSeqCounters[channel.id]}
						{#if diff}
							<span class="badge badge-sm badge-primary">
								{#if diff < 100}
									{diff}
								{:else}
									:)
								{/if}
							</span>
						{/if}
					{/if}
				</button>
			{/each}
		{/if}

		<div class="divider text-secondary mb-2.5 text-sm">
			{$t("channel_list.threads")}
		</div>
		{#if !threads?.length}
			<span class="text-secondary mt-2 text-sm">
				{$t("channel_list.no_threads")}
			</span>
		{:else}
			{#each threads as thread}
				<button
					onclick={() => selectChannel(thread.id)}
					class="btn btn-ghost flex w-full flex-row justify-between px-1.5"
					class:bg-primary={selectedChannel === thread.id}
				>
					<div
						class={[
							"flex w-full flex-row items-center gap-2.5",
							$storedSeqCounters &&
								currentSeqCounters &&
								$storedSeqCounters[thread.id] !== undefined &&
								currentSeqCounters[thread.id] !== undefined &&
								$storedSeqCounters[thread.id] < currentSeqCounters[thread.id] &&
								"w-[calc(100%-2rem)]!",
						]}
					>
						{#if thread.locked}
							<LockSimpleIcon class="size-4.5 min-w-4.5" />
						{:else if thread.isAnswered}
							<CheckCircleIcon class="size-4.5 min-w-4.5" />
						{:else if thread.category.isAnswerable}
							<QuestionIcon class="size-4.5 min-w-4.5" />
						{:else}
							<HashStraightIcon class="size-4.5 min-w-4.5" />
						{/if}
						<span class="truncate font-light">{thread.title}</span>
					</div>

					{#if $storedSeqCounters && currentSeqCounters && $storedSeqCounters[thread.id] !== undefined && currentSeqCounters[thread.id] !== undefined}
						{@const diff =
							currentSeqCounters[thread.id] - $storedSeqCounters[thread.id]}
						{#if diff}
							<span class="badge badge-sm badge-primary">
								{#if diff < 100}
									{diff}
								{:else}
									:)
								{/if}
							</span>
						{/if}
					{/if}
				</button>
			{/each}

			{#if threadsHasNextPage}
				<button
					onclick={loadMoreThreads}
					class="btn btn-ghost w-full justify-start px-1.5"
				>
					<span class="truncate font-light">
						{$t("channel_list.load_more")}
					</span>
				</button>
			{/if}
		{/if}
	{/if}
</div>
