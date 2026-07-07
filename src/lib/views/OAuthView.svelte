<script lang="ts">
	import { fetchClientId } from "$lib/backend";
	import { type Community } from "$lib/communities";
	import { db } from "$lib/db";
	import { t } from "$lib/i18n";

	import { invoke, isTauri } from "@tauri-apps/api/core";
	import { once } from "@tauri-apps/api/event";
	import { onMount } from "svelte";

	let {
		community,
		host,
		onComplete,
		onCancel,
	}: {
		community: Community;
		host: string;
		onComplete: () => void;
		onCancel: () => void;
	} = $props();

	let errorMessage: string | null = $state(null);

	let clientId: string | null = null;

	let code: string | null = $state(null);
	let url: string | null = $state(null);
	onMount(async () => {
		let { forge } = community;

		try {
			clientId = await fetchClientId(host, forge);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
			return;
		}

		if (await db.authorisedApps.get({ forge, clientId })) {
			onComplete();
			return;
		}

		if (!isTauri()) {
			errorMessage = $t("oauth_view.could_not_start_oauth", {
				error: "OAuth flow is not yet implemented for web",
			});
			return;
		}

		try {
			const { user_code, verification_uri } = await invoke<{
				user_code: string;
				verification_uri: string;
			}>("begin_device_auth", { forge, clientId });
			code = user_code;
			url = verification_uri;
		} catch (error) {
			errorMessage = $t("oauth_view.could_not_start_oauth", {
				error: error instanceof Error ? error.message : String(error),
			});
			return;
		}
	});

	once(
		"oauth_success",
		(event: { payload: { access_token: string; token_type: string } }) => {
			db.authorisedApps.put({
				forge: community.forge,
				clientId: clientId!,
				accessToken: event.payload.access_token,
			});
			onComplete();
		},
	);

	once("oauth_error", (event: { payload: { error: string } }) => {
		errorMessage = $t("oauth_view.could_not_complete_oauth", {
			error: event.payload.error,
		});
	});
</script>

<dialog open={true} class="modal">
	<div
		class="modal-box flex w-96 flex-col items-center justify-center gap-4 text-center"
	>
		<h3 class="text-lg font-bold">{$t("oauth_view.log_in")}</h3>

		{#if errorMessage}
			<p class="text-error">{errorMessage}</p>
		{:else if code && url}
			<p class="text-sm">{$t("oauth_view.enter_code")}</p>

			<div class="mockup-browser border-base-300 w-full border">
				<div class="mockup-browser-toolbar">
					<div class="input">
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							class="link link-info"
						>
							{url}
						</a>
					</div>
				</div>
				<button
					ondblclick={() => {
						if (code === $t("oauth_view.copied")) return;
						navigator.clipboard.writeText(code!);
						const realCode = code;
						code = $t("oauth_view.copied");
						setTimeout(() => (code = realCode), 2000);
					}}
					class="border-base-300 grid h-32 w-full cursor-pointer place-content-center border-t text-xl font-bold"
					class:tracking-[0.5em]={code !== $t("oauth_view.copied")}
				>
					{code}
				</button>
			</div>

			<div class="flex flex-row items-center justify-center">
				<span class="loading loading-ring loading-sm mr-2 duration-8000"></span>
				<span class="text-sm">{$t("oauth_view.waiting_for_response")}</span>
			</div>
		{:else}
			<span class="loading loading-spinner loading-lg"></span>
		{/if}

		<button class="btn btn-neutral mt-2 w-full" onclick={onCancel}>
			{errorMessage ? $t("dialog.close") : $t("dialog.cancel")}
		</button>
	</div>

	<form method="dialog" class="modal-backdrop">
		<!-- Automatically close dialog when clicking outside -->
		<button onclick={onCancel}>{$t("dialog.cancel")}</button>
	</form>
</dialog>
