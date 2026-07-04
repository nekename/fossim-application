<script lang="ts">
	import { marked } from "$lib/marked";
	import { t } from "$lib/i18n";

	import DOMPurify from "dompurify";

	let {
		onSubmit,
		prefilledText,
		noPadding,
	}: {
		onSubmit: (text: string) => void;
		prefilledText?: string;
		noPadding?: boolean;
	} = $props();

	// svelte-ignore state_referenced_locally
	let text = $state(prefilledText || "");

	let name = Math.random().toString(32).replace("0.", "");

	let textarea: HTMLTextAreaElement | null = null;
	$effect(() => {
		if (prefilledText && prefilledText.trim() && textarea) {
			textarea.focus();
			textarea.selectionStart = textarea.value.length;
		}
	});
</script>

<div class={[!noPadding && "border-base-300 border-t p-4"]}>
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
				bind:this={textarea}
				onkeydown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault();
						if (!text.trim()) return;
						onSubmit(text);
						text = "";
					} else if (
						prefilledText &&
						prefilledText.trim() &&
						e.key === "Escape"
					) {
						e.preventDefault();
						text = prefilledText;
						onSubmit(prefilledText);
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
