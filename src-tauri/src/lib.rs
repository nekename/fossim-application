mod oauth;
mod settings;

// Window visibility management and tray icon menu handling code was taken from
// <https://github.com/nekename/OpenDeck/blob/main/src-tauri/src/main.rs>
use tauri::menu::{IconMenuItemBuilder, MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WindowEvent};

#[tauri::command]
async fn open_url(url: String) {
	if let Err(e) = open::that_detached(&url) {
		eprintln!("Failed to open URL {}: {}", url, e);
	}
}

fn show_window(app: &AppHandle) -> Result<(), tauri::Error> {
	#[cfg(target_os = "macos")]
	{
		use tauri::ActivationPolicy;
		let _ = app.set_activation_policy(ActivationPolicy::Regular);
	}

	let window = app
		.get_webview_window("main")
		.ok_or_else(|| tauri::Error::WebviewNotFound)?;
	window.show().and_then(|_| window.set_focus())
}

fn hide_window(app: &AppHandle) -> Result<(), tauri::Error> {
	let window = app
		.get_webview_window("main")
		.ok_or_else(|| tauri::Error::WebviewNotFound)?;
	window.hide()?;

	#[cfg(target_os = "macos")]
	{
		use tauri::ActivationPolicy;
		let _ = app.set_activation_policy(ActivationPolicy::Accessory);
	}

	Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_notification::init())
		.invoke_handler(tauri::generate_handler![
			open_url,
			oauth::begin_device_auth,
			settings::get_settings,
			settings::set_settings
		])
		.setup(|app| {
			let label = IconMenuItemBuilder::with_id("label", "Fossim")
				.icon(app.default_window_icon().unwrap().clone())
				.enabled(false)
				.build(app)?;
			let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
			let hide = MenuItemBuilder::with_id("hide", "Hide").build(app)?;
			let restart = MenuItemBuilder::with_id("restart", "Restart").build(app)?;
			let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
			let separator = PredefinedMenuItem::separator(app)?;
			let menu = MenuBuilder::new(app)
				.items(&[
					&label, &separator, &show, &hide, &separator, &restart, &quit,
				])
				.build()?;
			let _tray = TrayIconBuilder::with_id("fossim")
				.menu(&menu)
				.icon(app.default_window_icon().unwrap().clone())
				.show_menu_on_left_click(false)
				.on_tray_icon_event(move |icon, event| {
					if let TrayIconEvent::Click {
						button,
						button_state,
						..
					} = event
					{
						if button != MouseButton::Left || button_state != MouseButtonState::Down {
							return;
						}

						let app_handle = icon.app_handle();
						let window = app_handle.get_webview_window("main").unwrap();
						let _ = if window.is_visible().unwrap_or(false) {
							hide_window(app_handle)
						} else {
							show_window(app_handle)
						};
					}
				})
				.on_menu_event(move |app, event| {
					let _ = match event.id().as_ref() {
						"show" => show_window(app),
						"hide" => hide_window(app),
						"restart" => app.restart(),
						"quit" => {
							app.exit(0);
							Ok(())
						}
						_ => Ok(()),
					};
				})
				.build(app)?;

			Ok(())
		})
		.on_window_event(|window, event| {
			if window.label() != "main" {
				return;
			}
			if let WindowEvent::CloseRequested { api, .. } = event {
				if let Ok(settings) = settings::get_settings(window.app_handle().clone())
					&& settings.minimise_to_tray
				{
					let _ = hide_window(window.app_handle());
					api.prevent_close();
				} else {
					window.app_handle().exit(0);
				}
			}
		})
		.run(tauri::generate_context!())
		.expect("Tauri application should be able to run");
}
