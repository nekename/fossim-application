<script lang="ts">
	import { t } from "$lib/i18n";

	let {
		host,
		onComplete,
		onCancel,
	}: { host: string; onComplete: () => void; onCancel: () => void } = $props();
</script>

<dialog open={true} class="modal">
	<div
		class="modal-box flex w-96 flex-col items-center justify-center gap-4 text-center"
	>
		<h3 class="text-lg font-bold">
			{$t("confirm_host_view.continue_with")}
			<br />
			<span><code>{host}</code>?</span>
		</h3>

		<p class="text-sm">{$t("confirm_host_view.explanation.1")}</p>
		<p class="text-sm">{$t("confirm_host_view.explanation.2")}</p>

		<button class="btn btn-neutral mt-2 w-full" onclick={onCancel}>
			{$t("dialog.cancel")}
		</button>
		<button class="btn btn-primary w-full" onclick={onComplete}>
			{$t("dialog.continue")}
		</button>
	</div>

	<form method="dialog" class="modal-backdrop">
		<!-- Automatically close dialog when clicking outside -->
		<button onclick={onCancel}>{$t("dialog.cancel")}</button>
	</form>
</dialog>
