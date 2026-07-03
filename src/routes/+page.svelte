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
	$effect(() => {
		if ($communities) {
			for (const community of $communities) {
				channels[`${community.forge}/${community.path}`] ??= {
					channels: [],
					threads: [],
				};
			}
		}
	});

	let selectedCommunity: Community | null = $state(null);
	let selectedChannel: { community: Community; id: string } | null =
		$state(null);
	$effect(() => {
		if (
			$communities &&
			!$communities.find(
				(c) =>
					c.forge === selectedCommunity?.forge &&
					c.path === selectedCommunity?.path,
			)
		) {
			selectedCommunity = null;
			selectedChannel = null;
		} else if (
			selectedChannel &&
			(selectedChannel.community.forge !== selectedCommunity?.forge ||
				selectedChannel.community.path !== selectedCommunity?.path)
		) {
			selectedChannel = null;
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
			{#if channels[`${community.forge}/${community.path}`]}
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
					bind:selectedChannel
				/>

				{#each channels[`${community.forge}/${community.path}`].channels.concat(channels[`${community.forge}/${community.path}`].threads) as channel (channel.id)}
					<MessageList
						{community}
						{channel}
						show={selectedCommunity?.forge === community.forge &&
							selectedCommunity?.path === community.path &&
							selectedChannel?.id === channel.id}
					/>
				{/each}
			{/if}
		{/each}

		{#if selectedCommunity && !selectedChannel}
			<div class="flex h-screen w-full items-center justify-center">
				<span class="text-base-content/50 text-lg">
					{$t("channel_list.select_channel")}
				</span>
			</div>
		{/if}
	</div>
{/if}
