import { locale } from "./i18n";

import { invoke, isTauri } from "@tauri-apps/api/core";
import { type Writable, writable } from "svelte/store";

export type Settings = {
	language: string;
	minimise_to_tray: boolean;
};

export const settings: Writable<Settings | null> = writable(null);
(async () => {
	if (isTauri()) {
		settings.set(await invoke("get_settings"));
	} else {
		settings.set(
			localStorage.getItem("settings")
				? JSON.parse(localStorage.getItem("settings")!)
				: { language: "en", minimise_to_tray: false },
		);
	}
})();
settings.subscribe(async (value) => {
	if (value) {
		if (isTauri()) {
			await invoke("set_settings", { settings: value });
		} else {
			localStorage.setItem("settings", JSON.stringify(value));
		}
		locale.set(value.language);
	}
});
