<script lang="ts">
	import JoinCommunityView from "$lib/views/JoinCommunityView.svelte";

	import { db, liveQuery } from "$lib/db";
	import { t } from "$lib/i18n";

	import PlusIcon from "phosphor-svelte/lib/PlusIcon";

	let communities = liveQuery(() => db.communities.toArray());

	let isDrawerOpen = $state(false);
	let joinCommunityViewOpen = $state(false);
</script>

<div
	class="drawer drawer-open w-min"
	role="list"
	onmouseover={() => (isDrawerOpen = true)}
	onfocus={() => (isDrawerOpen = true)}
	onmouseleave={() => (isDrawerOpen = false)}
	onblur={() => (isDrawerOpen = false)}
>
	<input bind:checked={isDrawerOpen} type="checkbox" class="drawer-toggle" />
	<div class="drawer-side is-drawer-close:overflow-visible">
		<div
			class="bg-base-300 is-drawer-close:w-20 is-drawer-open:w-72 flex min-h-full flex-col items-start justify-center py-0.5"
		>
			<ul class="menu w-full grow gap-2">
				{#each $communities as community}
					<li>
						<button>
							{#if community.forge === "github"}
								<img
									src={"https://avatars.githubusercontent.com/" +
										community.path.split("/")[0]}
									alt={community.path.split("/")[0]}
									class="mr-1 inline-block size-10 min-w-10"
								/>
							{:else}
								<span
									class="bg-base-content text-primary mr-1 flex size-10 min-w-10 items-center justify-center rounded-full"
								>
									{community.path.split("/")[0][0].toUpperCase()}
								</span>
							{/if}
							<span class="is-drawer-close:hidden truncate font-medium">
								{community.path.split("/")[1]}
							</span>
						</button>
					</li>
				{/each}

				<div class="divider -my-0.5"></div>

				<li>
					<button onclick={() => (joinCommunityViewOpen = true)}>
						<PlusIcon
							class="text-base-content mr-1 inline-block size-10 min-w-10"
						/>
						<span class="is-drawer-close:hidden truncate">
							{$t("community_list.join_community")}
						</span>
					</button>
				</li>
			</ul>
		</div>
	</div>
</div>

{#if joinCommunityViewOpen}
	<JoinCommunityView onClose={() => (joinCommunityViewOpen = false)} />
{/if}
