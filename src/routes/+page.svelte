<script lang="ts">
	import ChannelList from "$lib/sections/ChannelList.svelte";
	import CommunityList from "$lib/sections/CommunityList.svelte";
	import MessageList from "$lib/sections/MessageList.svelte";
	import OnboardingView from "$lib/views/OnboardingView.svelte";

	import type { Channel, Community, Thread } from "$lib/communities";
	import { db, liveQuery } from "$lib/db";
	import { t } from "$lib/i18n";

	let communities = liveQuery(() => db.communities.toArray());
	let channels: {
		[community: string]: {
			channels: Channel[];
			threads: Thread[];
		};
	} = $state({});
	let selectedChannels: {
		[community: string]: string | null;
	} = $state({});
	$effect(() => {
		if ($communities) {
			for (const community of $communities) {
				channels[`${community.forge}/${community.path}`] ??= {
					channels: [],
					threads: [],
				};
				selectedChannels[`${community.forge}/${community.path}`] ??= null;
			}
		}
	});

	let selectedCommunity: Community | null = $state(null);
	$effect(() => {
		if (
			$communities &&
			selectedCommunity &&
			!$communities.find(
				(c) =>
					c.forge === selectedCommunity!.forge &&
					c.path === selectedCommunity!.path,
			)
		) {
			selectedChannels[
				`${selectedCommunity!.forge}/${selectedCommunity!.path}`
			] = null;
			selectedCommunity = null;
		}
	});
</script>

{#if !$communities}
	<div class="flex h-screen items-center justify-center">
		<span class="loading loading-ring loading-xl"></span>
	</div>
{:else if $communities.length === 0}
	<OnboardingView />
{:else}
	<div class="flex flex-row">
		<CommunityList bind:selectedCommunity />

		{#if !selectedCommunity}
			<div class="flex h-screen w-full items-center justify-center">
				<span class="text-base-content/50 text-lg">
					{$t("channel_list.select_community")}
				</span>
			</div>
		{/if}

		{#each $communities as community}
			{#if channels[`${community.forge}/${community.path}`] && selectedChannels[`${community.forge}/${community.path}`] !== undefined}
				<ChannelList
					{community}
					show={selectedCommunity?.forge === community.forge &&
						selectedCommunity?.path === community.path}
					bind:channels={
						channels[`${community.forge}/${community.path}`].channels
					}
					bind:threads={
						channels[`${community.forge}/${community.path}`].threads
					}
					bind:selectedChannel={
						selectedChannels[`${community.forge}/${community.path}`]
					}
				/>

				{#each channels[`${community.forge}/${community.path}`].channels.concat(channels[`${community.forge}/${community.path}`].threads) as channel (channel.id)}
					<MessageList
						{community}
						{channel}
						show={selectedCommunity?.forge === community.forge &&
							selectedCommunity?.path === community.path &&
							selectedChannels[`${community.forge}/${community.path}`] ===
								channel.id}
					/>
				{/each}
			{/if}
		{/each}

		{#if selectedCommunity && !selectedChannels[`${selectedCommunity.forge}/${selectedCommunity.path}`]}
			<div class="flex h-screen w-full items-center justify-center">
				<span class="text-base-content/50 text-lg">
					{$t("channel_list.select_channel")}
				</span>
			</div>
		{/if}
	</div>
{/if}
