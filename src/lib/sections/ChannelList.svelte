<script lang="ts">
	import {
		fetchChannels,
		fetchThreads,
		leaveCommunity,
		type Channel,
		type Community,
		type Thread,
	} from "$lib/communities";
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
		channels = $bindable(),
		threads = $bindable(),
		selectedChannel = $bindable(),
	}: {
		community: Community;
		show: boolean;
		channels: Channel[] | null;
		threads: Thread[] | null;
		selectedChannel: { community: Community; id: string } | null;
	} = $props();

	let errorMessage: string | null = $state(null);

	let threadsHasNextPage: boolean | null = $state(null);
	let threadsEndCursor: string | null = $state(null);

	onMount(async () => {
		try {
			channels = await fetchChannels(community);
			const threadsRes = await fetchThreads(community);
			threads = threadsRes.threads;
			threadsHasNextPage = threadsRes.hasNextPage;
			threadsEndCursor = threadsRes.endCursor;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	});

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
					onclick={() => (selectedChannel = { community, id: channel.id })}
					class="btn btn-ghost w-full justify-start px-1.5"
				>
					{#if channel.locked}
						<LockSimpleIcon class="mr-1 size-4.5 min-w-4.5" />
					{:else}
						<HashStraightIcon class="mr-1 size-4.5 min-w-4.5" />
					{/if}
					<span class="truncate font-medium">{channel.title}</span>
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
					onclick={() => (selectedChannel = { community, id: thread.id })}
					class="btn btn-ghost w-full justify-start px-1.5"
				>
					{#if thread.isAnswered}
						<CheckCircleIcon class="mr-1 size-4.5 min-w-4.5" />
					{:else if thread.category.isAnswerable}
						<QuestionIcon class="mr-1 size-4.5 min-w-4.5" />
					{:else if thread.locked}
						<LockSimpleIcon class="mr-1 size-4.5 min-w-4.5" />
					{:else}
						<HashStraightIcon class="mr-1 size-4.5 min-w-4.5" />
					{/if}
					<span class="truncate font-light">{thread.title}</span>
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
