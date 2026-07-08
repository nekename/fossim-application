use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, command};

#[derive(Serialize, Deserialize)]
pub struct Settings {
	pub language: String,
	pub minimise_to_tray: bool,
}

impl Default for Settings {
	fn default() -> Self {
		Self {
			language: "en".to_owned(),
			minimise_to_tray: true,
		}
	}
}

#[command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
	let path = app
		.path()
		.app_config_dir()
		.map_err(|e| e.to_string())?
		.join("settings.json");
	if std::fs::metadata(&path).is_ok() {
		let contents = std::fs::read_to_string(&path).unwrap_or_default();
		Ok(serde_json::from_str(&contents).unwrap_or_default())
	} else {
		Ok(Settings::default())
	}
}

#[command]
pub fn set_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
	let path = app
		.path()
		.app_config_dir()
		.map_err(|e| e.to_string())?
		.join("settings.json");
	let contents = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
	std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
	std::fs::write(&path, contents).map_err(|e| e.to_string())?;
	Ok(())
}
