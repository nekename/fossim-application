#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(
			tauri_plugin_svelte::Builder::new()
				.path(
					dirs::config_dir()
						.expect("config dir should be available")
						.join("fossim"),
				)
				.build(),
		)
		.invoke_handler(tauri::generate_handler![])
		.run(tauri::generate_context!())
		.expect("Tauri application should be able to run");
}
