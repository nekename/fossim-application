#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![])
		.run(tauri::generate_context!())
		.expect("Tauri application should be able to run");
}
