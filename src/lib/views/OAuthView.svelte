<script lang="ts">
	import { makeApiRequest } from "$lib/backend";
	import { parseCommunityUrl } from "$lib/communities";

	import { onMount } from "svelte";

	let { community, host }: { community: string; host: string } = $props();

	onMount(async () => {
		let { forge } = await parseCommunityUrl(community);

		let clientId;
		try {
			clientId = (await makeApiRequest(host, `/api/oauth/${forge}/client_id`)).client_id;
			alert(clientId);
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		}
	});
</script>
