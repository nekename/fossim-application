<script lang="ts">
	import { fetchClientId } from "$lib/backend";
	import { fetchCommunityHost, type Community } from "$lib/communities";
	import { db } from "$lib/db";
	import { t } from "$lib/i18n";

	import { Octokit } from "octokit";
	import { onMount } from "svelte";

	let { community }: { community: Community } = $props();

	let errorMessage: string | null = $state(null);

	let host: string | null = $state(null);
	let channels: string[] | null = $state(null);
	let threads: string[] | null = $state(null);

	onMount(async () => {
		try {
			host = await fetchCommunityHost(community);
			const clientId = await fetchClientId(host, community.forge);
			const accessToken = (
				await db.authorisedApps.get({ forge: community.forge, clientId })
			)?.accessToken;

			const octokit = new Octokit({ auth: accessToken });
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	});
</script>

<div class="flex h-screen w-full flex-col items-center justify-center">
	{#if errorMessage}
		<div class="alert alert-error">
			<span>{errorMessage}</span>
		</div>
	{/if}
</div>
