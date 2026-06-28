<script lang="ts">
	import ConfirmHostView from "$lib/views/ConfirmHostView.svelte";

	import { fetchCommunityHost } from "$lib/communities";
	import { t } from "$lib/i18n";

	let repositoryInput: HTMLInputElement;

	let fetchedHost: string | null = $state(null);
	let errorMessage: string | null = $state(null);
	let clearMessageTimeout: number | null = null;
	$effect(() => {
		if (errorMessage) {
			if (clearMessageTimeout !== null) clearTimeout(clearMessageTimeout);
			clearMessageTimeout = setTimeout(() => (errorMessage = null), 5000);
		}
	});

	async function fetchHost() {
		try {
			fetchedHost = await fetchCommunityHost(repositoryInput.value);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}
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
	{:else if fetchedHost}
		<ConfirmHostView
			host={fetchedHost}
			onComplete={() => {}}
			onCancel={() => (fetchedHost = null)}
		/>
	{/if}
</div>
