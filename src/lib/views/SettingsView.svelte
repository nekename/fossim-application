<script lang="ts">
	import { t } from "$lib/i18n";
	import { settings } from "$lib/settings";

	let { onClose }: { onClose: () => void } = $props();
</script>

<dialog open={true} class="modal">
	<div class="modal-box flex w-96 flex-col justify-center gap-4">
		<h3 class="text-lg font-bold">{$t("settings_view.settings")}</h3>

		{#if $settings}
			<label for="settings-language" class="select w-full">
				<span class="label">{$t("settings_view.language")}</span>
				<select bind:value={$settings.language} id="settings-language">
					<option value="en">English</option>
				</select>
			</label>
		{:else}
			<p class="text-error text-sm">
				{$t("settings_view.unable_to_load_settings")}
			</p>
		{/if}

		<button class="btn btn-neutral mt-2 w-full" onclick={onClose}>
			{$t("dialog.close")}
		</button>
	</div>

	<form method="dialog" class="modal-backdrop">
		<!-- Automatically close dialog when clicking outside -->
		<button onclick={onClose}>{$t("dialog.close")}</button>
	</form>
</dialog>
