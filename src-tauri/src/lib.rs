mod oauth;

#[tauri::command]
async fn open_url(url: String) {
	if let Err(e) = open::that_detached(&url) {
		eprintln!("Failed to open URL {}: {}", url, e);
	}
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_notification::init())
		.invoke_handler(tauri::generate_handler![open_url, oauth::begin_device_auth])
		.run(tauri::generate_context!())
		.expect("Tauri application should be able to run");
}
