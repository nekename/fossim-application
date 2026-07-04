<script lang="ts">
	import { marked } from "$lib/marked";
	import { t } from "$lib/i18n";

	import DOMPurify from "dompurify";

	let { onSubmit }: { onSubmit: (text: string) => void } = $props();

	let text = $state("");

	let name = Math.random().toString(32).replace("0.", "");
</script>

<div class="border-base-300 border-t p-4">
	<div class="tabs tabs-lift relative flex w-full">
		<input
			type="radio"
			{name}
			class="tab checked:bg-base-200"
			aria-label={$t("message_box.write")}
			checked
		/>
		<div
			class="tab-content border-base-300 bg-base-200 max-h-96 min-h-28 w-full overflow-scroll"
		>
			<textarea
				bind:value={text}
				onkeydown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault();
						if (!text.trim()) return;
						onSubmit(text);
						text = "";
					}
				}}
				class="textarea bg-base-200 field-sizing-content h-auto w-full resize-none border-none p-4 focus:outline-none"
				maxlength="65536"
				placeholder={$t("message_box.press_enter_to_send")}></textarea>
		</div>

		<input
			type="radio"
			{name}
			class="tab checked:bg-base-200"
			aria-label={$t("message_box.preview")}
		/>
		<div
			class="tab-content prose comment border-base-300 bg-base-200 max-h-96 min-h-28 w-full overflow-scroll p-4"
		>
			{#await marked.parse(text, { breaks: true }) then parsedText}
				{@html DOMPurify.sanitize(parsedText)}
			{/await}
		</div>
	</div>
</div>
