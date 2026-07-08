fn main() {
	built::write_built_file().expect("build-time information should be able to be acquired");
	tauri_build::build()
}
