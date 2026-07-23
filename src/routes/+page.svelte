<script lang="ts">
	import ChannelList from "$lib/sections/ChannelList.svelte";
	import CommunityList from "$lib/sections/CommunityList.svelte";
	import MessageList from "$lib/sections/MessageList.svelte";
	import OnboardingView from "$lib/views/OnboardingView.svelte";
	import UpdaterView from "$lib/views/UpdaterView.svelte";

	import type { Channel, Community, Thread } from "$lib/communities";
	import { db, liveQuery } from "$lib/db";
	import { t } from "$lib/i18n";

	import XCircleIcon from "phosphor-svelte/lib/XCircleIcon";

	let communities = liveQuery(() => db.communities.toArray());
	let channels: {
		[community: string]: {
			eventTarget: EventTarget;
			channels: Channel[];
			threads: Thread[];
			notifCount: number;
		};
	} = $state({});
	let selectedChannels: {
		[community: string]: string | null;
	} = $state({});
	$effect(() => {
		if ($communities) {
			for (const community of $communities) {
				const cid = `${community.forge}/${community.path}`;
				channels[cid] ??= {
					channels: [],
					threads: [],
					eventTarget: new EventTarget(),
					notifCount: 0,
				};
				selectedChannels[cid] ??= null;

				if (
					selectedChannels[cid] &&
					!channels[cid].channels.find((c) => c.id === selectedChannels[cid]) &&
					!channels[cid].threads.find((t) => t.id === selectedChannels[cid])
				) {
					selectedChannels[cid] = null;
				}
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
	{#if !localStorage.getItem("faq-notice-dismissed")}
		<div
			class="alert alert-warning flex h-8 flex-row items-center justify-center rounded-none"
			id="faq-notice"
		>
			<span>
				{$t("alert.faq_notice.1")}
				<a
					class="link link-primary"
					href="https://github.com/nekename/fossim-application/wiki/FAQ"
					target="_blank"
				>
					{$t("alert.faq_notice.2")}
				</a>
				{$t("alert.faq_notice.3")}
			</span>

			<button
				class="cursor-pointer"
				onclick={() => {
					localStorage.setItem("faq-notice-dismissed", "true");
					document.getElementById("faq-notice")?.remove();
				}}
			>
				<XCircleIcon class="text-black" />
			</button>
		</div>
	{/if}

	<div class="flex flex-row">
		<CommunityList
			bind:selectedCommunity
			notifCounts={Object.fromEntries(
				Object.entries(channels).map(([k, v]) => [k, v.notifCount]),
			)}
		/>

		{#if !selectedCommunity}
			<div class="flex h-screen w-full items-center justify-center">
				<span class="text-base-content/50 text-lg">
					{$t("channel_list.select_community")}
				</span>
			</div>
		{/if}

		{#each $communities as community}
			{@const cid = `${community.forge}/${community.path}`}

			{#if channels[cid] && selectedChannels[cid] !== undefined}
				<ChannelList
					{community}
					show={selectedCommunity?.forge === community.forge &&
						selectedCommunity?.path === community.path}
					eventTarget={channels[cid].eventTarget}
					bind:channels={channels[cid].channels}
					bind:threads={channels[cid].threads}
					bind:selectedChannel={selectedChannels[cid]}
					bind:notifCount={channels[cid].notifCount}
				/>

				{#each channels[cid].channels.concat(channels[cid].threads) as channel (channel.id)}
					<MessageList
						{community}
						{channel}
						eventTarget={channels[cid].eventTarget}
						show={selectedCommunity?.forge === community.forge &&
							selectedCommunity?.path === community.path &&
							selectedChannels[cid] === channel.id}
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

<UpdaterView />
