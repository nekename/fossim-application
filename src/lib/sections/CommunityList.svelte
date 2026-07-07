<script lang="ts">
	import JoinCommunityView from "$lib/views/JoinCommunityView.svelte";

	import type { Community } from "$lib/communities";
	import { db, liveQuery } from "$lib/db";
	import { t } from "$lib/i18n";

	import PlusIcon from "phosphor-svelte/lib/PlusIcon";

	let {
		selectedCommunity = $bindable(),
		notifCounts,
	}: {
		selectedCommunity: Community | null;
		notifCounts: { [communityId: string]: number };
	} = $props();

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
						<button
							onclick={() => {
								selectedCommunity = community;
							}}
							class:w-min={!isDrawerOpen}
							class:menu-active={selectedCommunity?.forge === community.forge &&
								selectedCommunity?.path === community.path}
						>
							{#if community.forge === "github"}
								<img
									src={"https://avatars.githubusercontent.com/" +
										community.path.split("/")[0]}
									alt={community.path.split("/")[0]}
									class={[
										"drop-shadow-primary inline-block size-10 min-w-10 rounded-full transition-all duration-200",
										isDrawerOpen && "mr-1",
										!isDrawerOpen &&
											(selectedCommunity?.forge !== community.forge ||
												selectedCommunity?.path !== community.path) &&
											"blur-[1px]",
										selectedCommunity?.forge === community.forge &&
											selectedCommunity?.path === community.path &&
											"drop-shadow-xl/30",
									]}
								/>
							{:else}
								<span
									class={[
										"drop-shadow-primary bg-base-content text-primary flex size-10 min-w-10 items-center justify-center rounded-full transition-all duration-200",
										isDrawerOpen && "mr-1",
										!isDrawerOpen &&
											(selectedCommunity?.forge !== community.forge ||
												selectedCommunity?.path !== community.path) &&
											"blur-[1px]",
										selectedCommunity?.forge === community.forge &&
											selectedCommunity?.path === community.path &&
											"drop-shadow-xl/30",
									]}
								>
									{community.path.split("/")[0][0].toUpperCase()}
								</span>
							{/if}

							{#if notifCounts[`${community.forge}/${community.path}`] > 0}
								<span
									class="badge badge-sm badge-primary absolute right-1 bottom-1 z-10"
								>
									{#if notifCounts[`${community.forge}/${community.path}`] < 100}
										{notifCounts[`${community.forge}/${community.path}`]}
									{:else}
										:)
									{/if}
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
					<button
						onclick={() => (joinCommunityViewOpen = true)}
						class:w-min={!isDrawerOpen}
					>
						<PlusIcon
							class={[
								"text-base-content inline-block size-10 min-w-10 transition-all duration-200",
								isDrawerOpen && "mr-1",
							]}
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
	<JoinCommunityView
		onComplete={(community) => {
			joinCommunityViewOpen = false;
			selectedCommunity = community;
		}}
		onClose={() => (joinCommunityViewOpen = false)}
	/>
{/if}
