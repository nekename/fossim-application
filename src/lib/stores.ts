import { RuneStore } from "@tauri-store/svelte";

export const communities = new RuneStore<{ [forge: string]: string[] }>(
	"communities",
	{},
	{ autoStart: true, saveOnChange: true },
);
