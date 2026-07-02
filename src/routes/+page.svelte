<script lang="ts">
	import ChannelList from "$lib/sections/ChannelList.svelte";
	import CommunityList from "$lib/sections/CommunityList.svelte";
	import OnboardingView from "$lib/views/OnboardingView.svelte";

	import type { Community } from "$lib/communities";
	import { db, liveQuery } from "$lib/db";
	import { t } from "$lib/i18n";

	let communities = liveQuery(() => db.communities.toArray());

	let selectedCommunity: Community | null = $state(null);
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
			<ChannelList
				{community}
				show={selectedCommunity?.forge === community.forge &&
					selectedCommunity?.path === community.path}
			/>
		{/each}
	</div>
{/if}
