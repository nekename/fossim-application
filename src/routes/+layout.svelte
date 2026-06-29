<script lang="ts">
	import "../app.css";

	import { isTauri, invoke } from "@tauri-apps/api/core";

	let { children } = $props();
</script>

<svelte:document
	onclick={(event) => {
		if (!isTauri()) return;
		const target = (event.target as HTMLElement)?.closest(
			"a[target='_blank']",
		) as HTMLAnchorElement | null;
		if (!target) return;
		event.preventDefault();
		invoke("open_url", { url: target.href });
	}}
/>

{@render children()}
