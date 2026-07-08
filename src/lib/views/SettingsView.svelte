<script lang="ts">
	import { t } from "$lib/i18n";
	import { settings } from "$lib/settings";

	import { invoke, isTauri } from "@tauri-apps/api/core";

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

			{#if isTauri()}
				<div
					class="rounded-field flex w-full items-center border border-current/20"
				>
					<label
						for="settings-minimise_to_tray"
						class="label grow border-r border-current/20 px-3 py-2.5 text-sm"
					>
						{$t("settings_view.minimise_to_tray")}
					</label>
					<div class="px-2.5">
						<input
							bind:checked={$settings.minimise_to_tray}
							type="checkbox"
							id="settings-minimise_to_tray"
							class="checkbox"
						/>
					</div>
				</div>

				<div
					class="rounded-field flex w-full items-center border border-current/20"
				>
					<label
						for="settings-check_for_updates"
						class="label grow border-r border-current/20 px-3 py-2.5 text-sm"
					>
						{$t("settings_view.check_for_updates")}
					</label>
					<div class="px-2.5">
						<input
							bind:checked={$settings.check_for_updates}
							type="checkbox"
							id="settings-check_for_updates"
							class="checkbox"
						/>
					</div>
				</div>
			{/if}

			<div
				class="rounded-field flex w-full items-center border border-current/20"
			>
				<label
					for="settings-collect_statistics"
					class="label grow border-r border-current/20 px-3 py-2.5 text-sm"
				>
					{$t("settings_view.collect_statistics")}
				</label>
				<div class="px-2.5">
					<input
						bind:checked={$settings.collect_statistics}
						type="checkbox"
						id="settings-collect_statistics"
						class="checkbox"
					/>
				</div>
			</div>
		{:else}
			<p class="text-error text-sm">
				{$t("settings_view.unable_to_load_settings")}
			</p>
		{/if}

		{#if isTauri()}
			{#await invoke("get_build_info")}
				<p class="text-secondary text-xs">
					{$t("settings_view.loading_build_info")}
				</p>
			{:then buildInfo}
				<p class="text-secondary text-xs">{buildInfo}</p>
			{:catch error}
				<p class="text-error text-xs">
					{error instanceof Error ? error.message : String(error)}
				</p>
			{/await}
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
