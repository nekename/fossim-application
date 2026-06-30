<script lang="ts">
	import CommunityList from "$lib/sections/CommunityList.svelte";
	import OnboardingView from "$lib/views/OnboardingView.svelte";

	import type { Community } from "$lib/communities";
	import { db, liveQuery } from "$lib/db";
	import { t } from "$lib/i18n";
	import ChannelList from "$lib/sections/ChannelList.svelte";

	let communities = liveQuery(() => db.communities.toArray());

	let selectedCommunity: Community | null = $state(null);
</script>

{#if !$communities}
	<div class="flex h-screen items-center justify-center">
		<span class="loading loading-ring loading-xl"></span>
	</div>
{:else if $communities.length === 0}
	<OnboardingView />
{:else}
	<div class="flex flex-row">
		<CommunityList
			selectCommunity={(community) => (selectedCommunity = community)}
		/>

		{#if !selectedCommunity}
			<div class="flex h-screen flex-1 items-center justify-center">
				<span class="text-base-content/50 text-lg">
					{$t("channel_list.select_community")}
				</span>
			</div>
		{:else}
			<ChannelList community={selectedCommunity} />
		{/if}
	</div>
{/if}
