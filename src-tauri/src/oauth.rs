use secrecy::ExposeSecret;
use tauri::Emitter;

#[tauri::command]
pub async fn begin_device_auth(
	app: tauri::AppHandle,
	forge: String,
	client_id: String,
) -> Result<serde_json::Value, String> {
	match forge.as_str() {
		"github" => begin_github_device_auth(app, client_id).await,
		_ => Err("Unsupported forge".to_string()),
	}
}

async fn begin_github_device_auth(
	app: tauri::AppHandle,
	client_id: String,
) -> Result<serde_json::Value, String> {
	let crab = octocrab::Octocrab::builder()
		.base_uri("https://github.com")
		.unwrap()
		.add_header(
			tauri::http::HeaderName::from_static("accept"),
			"application/json".to_string(),
		)
		.build()
		.map_err(|e| e.to_string())?;

	let device_codes = crab
		.authenticate_as_device(&client_id.clone().into(), Vec::<String>::new())
		.await
		.map_err(|e| e.to_string())?;

	let return_value = serde_json::json!({
		"user_code": device_codes.user_code.clone(),
		"verification_uri": device_codes.verification_uri.clone(),
	});

	tauri::async_runtime::spawn(async move {
		match device_codes
			.poll_until_available(&crab, &client_id.into())
			.await
		{
			Ok(oauth) => app
				.emit(
					"oauth_success",
					serde_json::json!({
						"access_token": oauth.access_token.expose_secret(),
						"token_type": oauth.token_type,
					}),
				)
				.unwrap(),
			Err(e) => app
				.emit(
					"oauth_error",
					serde_json::json!({
						"error": e.to_string(),
					}),
				)
				.unwrap(),
		}
	});

	Ok(return_value)
}
