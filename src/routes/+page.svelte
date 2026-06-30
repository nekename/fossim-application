<script lang="ts">
	import CommunityList from "$lib/sections/CommunityList.svelte";
	import OnboardingView from "$lib/views/OnboardingView.svelte";

	import { db, liveQuery } from "$lib/db";

	let communities = liveQuery(() => db.communities.toArray());
</script>

{#if !$communities}
	<div class="flex h-screen items-center justify-center">
		<span class="loading loading-ring loading-xl"></span>
	</div>
{:else if $communities.length === 0}
	<OnboardingView />
{:else}
	<div class="flex flex-row">
		<CommunityList />
	</div>
{/if}
