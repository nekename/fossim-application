<script lang="ts">
	import ConfirmHostView from "$lib/views/ConfirmHostView.svelte";
	import OAuthView from "$lib/views/OAuthView.svelte";

	import {
		fetchCommunityConfig,
		parseCommunityUrl,
		type Community,
	} from "$lib/communities";
	import { db } from "$lib/db";
	import { t } from "$lib/i18n";

	let {
		onComplete,
		onClose,
	}: { onComplete: (community: Community) => void; onClose: () => void } =
		$props();

	let repositoryInput: HTMLInputElement;

	let errorMessage: string | null = $state(null);

	let fetchedCommunity: Community | null = $state(null);
	let fetchedHost: string | null = $state(null);
	let hostConfirmed: boolean = $state(false);
	async function fetchHost() {
		errorMessage = null;
		let host;
		try {
			fetchedCommunity = await parseCommunityUrl(repositoryInput.value);
			if (
				await db.communities.get({
					forge: fetchedCommunity.forge,
					path: fetchedCommunity.path,
				})
			) {
				throw new Error($t("join_community_view.already_joined"));
			}
			host = (await fetchCommunityConfig(fetchedCommunity)).host;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
			return;
		}

		let hosts = [];
		for (const community of await db.communities.toArray()) {
			try {
				hosts.push((await fetchCommunityConfig(community)).host);
			} catch {}
		}
		if (hosts.includes(host)) hostConfirmed = true;
		fetchedHost = host;
	}

	async function joinCommunity() {
		await db.communities.put({
			forge: fetchedCommunity!.forge,
			path: fetchedCommunity!.path,
		});
		onComplete(fetchedCommunity!);
	}
</script>

<dialog open={true} class="modal">
	<div
		class="modal-box flex w-96 flex-col items-center justify-center gap-4 text-center"
	>
		<h1 class="text-lg font-bold">{$t("join_community_view.title")}</h1>
		<p class="my-1 text-sm">{$t("join_community_view.join_community")}</p>

		<input
			bind:this={repositoryInput}
			type="text"
			class="input not-user-invalid:input-primary user-invalid:validator w-full"
			placeholder="https://github.com/author/repo"
			pattern="^(https?://)(github\.com/)[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$"
		/>

		{#if errorMessage}
			<div class="alert alert-error w-full">
				<span>{errorMessage}</span>
			</div>
		{/if}

		<button class="btn btn-neutral mt-1 w-full" onclick={onClose}>
			{$t("dialog.cancel")}
		</button>
		<button class="btn btn-primary w-full" onclick={fetchHost}>
			{$t("join_community_view.join")}
		</button>
	</div>

	<form method="dialog" class="modal-backdrop">
		<!-- Automatically close dialog when clicking outside -->
		<button onclick={onClose}>{$t("dialog.cancel")}</button>
	</form>
</dialog>

{#if !errorMessage && fetchedHost && !hostConfirmed}
	<ConfirmHostView
		host={fetchedHost}
		onComplete={() => (hostConfirmed = true)}
		onCancel={() => {
			fetchedCommunity = null;
			fetchedHost = null;
		}}
	/>
{:else if !errorMessage && hostConfirmed}
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
