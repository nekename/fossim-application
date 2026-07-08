<script lang="ts">
	import { t } from "$lib/i18n";
	import { marked } from "$lib/marked";
	import { settings } from "$lib/settings";

	import { invoke, isTauri } from "@tauri-apps/api/core";
	import DOMPurify from "dompurify";

	let updateDetails: { tag_name: string; body: string; url: string } | null =
		$state(null);
	$effect(() => {
		if (isTauri() && $settings?.check_for_updates) {
			(async () => {
				try {
					updateDetails = await invoke("check_for_updates");
				} catch (error) {
					console.error("Failed to check for updates:", error);
				}
			})();
		}
	});
</script>

{#if updateDetails}
	<dialog open={true} class="modal">
		<div class="modal-box flex w-96 flex-col justify-center gap-4">
			<h3 class="text-lg font-bold">{$t("updater_view.update_available")}</h3>

			<p>
				{$t("updater_view.new_version_available", {
					tag_name: updateDetails.tag_name,
				})}
			</p>

			<div class="prose comment max-w-full text-sm">
				{#await marked.parse(updateDetails.body, { // @ts-expect-error
					community: { forge: "github", path: "nekename/fossim-application" }, breaks: true }) then parsedBody}
					{@html DOMPurify.sanitize(parsedBody)}
				{/await}
			</div>

			<button
				class="btn btn-neutral mt-2 w-full"
				onclick={() => (updateDetails = null)}
			>
				{$t("dialog.close")}
			</button>
			<button
				class="btn btn-primary w-full"
				onclick={() => window.open(updateDetails!.url, "_blank")}
			>
				{$t("updater_view.open")}
			</button>
		</div>

		<form method="dialog" class="modal-backdrop">
			<!-- Automatically close dialog when clicking outside -->
			<button onclick={() => (updateDetails = null)}>
				{$t("dialog.close")}
			</button>
		</form>
	</dialog>
{/if}
