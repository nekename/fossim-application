<script lang="ts">
	import ConfirmHostView from "$lib/views/ConfirmHostView.svelte";
	import OAuthView from "$lib/views/OAuthView.svelte";

	import {
		fetchCommunityHost,
		parseCommunityUrl,
		type Community,
	} from "$lib/communities";
	import { db } from "$lib/db";
	import { t } from "$lib/i18n";

	let repositoryInput: HTMLInputElement;

	let errorMessage: string | null = $state(null);
	let clearMessageTimeout: number | null = null;
	$effect(() => {
		if (errorMessage) {
			if (clearMessageTimeout !== null) clearTimeout(clearMessageTimeout);
			clearMessageTimeout = setTimeout(() => (errorMessage = null), 5000);
		}
	});

	let fetchedCommunity: Community | null = $state(null);
	let fetchedHost: string | null = $state(null);
	let hostConfirmed: boolean = $state(false);
	async function fetchHost() {
		errorMessage = null;
		try {
			fetchedCommunity = await parseCommunityUrl(repositoryInput.value);
			fetchedHost = await fetchCommunityHost(fetchedCommunity);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	}

	async function joinCommunity() {
		await db.communities.put({
			forge: fetchedCommunity!.forge,
			path: fetchedCommunity!.path,
		});
	}
</script>

<div class="flex h-screen flex-col items-center justify-center">
	<h1 class="text-3xl font-semibold">{$t("onboarding_view.welcome")}</h1>
	<p class="mt-2 mb-4 text-lg">{$t("onboarding_view.join_community")}</p>

	<div class="join">
		<input
			bind:this={repositoryInput}
			type="text"
			class="input not-user-invalid:input-primary user-invalid:validator join-item w-96"
			placeholder="https://github.com/author/repo"
			pattern="^(https?://)(github\.com/)[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$"
		/>
		<button onclick={fetchHost} class="btn btn-primary join-item">
			{$t("onboarding_view.join")}
		</button>
	</div>

	<span class="mt-2 text-sm">
		{$t("onboarding_view.join_fossim_community.1")}
		<button
			onclick={() =>
				(repositoryInput.value =
					"https://github.com/nekename/fossim-application")}
			class="link link-info link-hover"
		>
			{$t("onboarding_view.join_fossim_community.2")}
		</button>
		{$t("onboarding_view.join_fossim_community.3")}
	</span>

	{#if errorMessage}
		<div class="toast">
			<div class="alert alert-error">
				<span>{errorMessage}</span>
			</div>
		</div>
	{:else if fetchedHost && !hostConfirmed}
		<ConfirmHostView
			host={fetchedHost}
			onComplete={() => (hostConfirmed = true)}
			onCancel={() => {
				fetchedCommunity = null;
				fetchedHost = null;
			}}
		/>
	{:else if hostConfirmed}
		<OAuthView
			community={fetchedCommunity!}
			host={fetchedHost!}
			onComplete={joinCommunity}
			onCancel={() => {
				fetchedCommunity = null;
				fetchedHost = null;
				hostConfirmed = false;
			}}
		/>
	{/if}
</div>
