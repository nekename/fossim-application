<script lang="ts">
	import OnboardingView from "$lib/views/OnboardingView.svelte";

	import { communities } from "$lib/stores";
</script>

{#if Object.values(communities.state)
	.map((v) => v.length)
	.reduce((a, b) => a + b, 0) === 0}
	<OnboardingView />
{/if}
