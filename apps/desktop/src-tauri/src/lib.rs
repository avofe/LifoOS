use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, Wry};
use tauri::App;
use tauri::webview::WebviewWindowBuilder;
use tauri::WebviewUrl;

struct ApiProcess(Mutex<Option<Child>>);

fn start_api(api_dir: &std::path::Path) -> Option<Child> {
    let wrapper = api_dir.join("index.js");
    if !wrapper.exists() {
        eprintln!("[lifeos] API wrapper not found at {:?}", wrapper);
        return None;
    }

    let static_dir = api_dir.join("web");

    let mut cmd = Command::new("node");
    cmd.arg(&wrapper)
        .env("NODE_ENV", "production")
        .env("PORT", "4000")
        .current_dir(api_dir);

    if static_dir.exists() {
        cmd.env("STATIC_DIR", static_dir.to_string_lossy().to_string());
        println!("[lifeos] STATIC_DIR: {:?}", static_dir);
    }

    let child = cmd.spawn().ok()?;
    println!("[lifeos] API started (pid: {})", child.id());
    Some(child)
}

fn wait_for_api() {
    let start = std::time::Instant::now();
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .ok();

    while start.elapsed().as_secs() < 15 {
        if let Some(ref c) = client {
            if c.get("http://127.0.0.1:4000/api/health")
                .send()
                .map(|r| r.status().is_success())
                .unwrap_or(false)
            {
                println!("[lifeos] API ready");
                return;
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    eprintln!("[lifeos] API did not start in time — check Node.js and API bundle");
}

fn find_api_dir(app: &App<Wry>) -> Option<std::path::PathBuf> {
    if cfg!(debug_assertions) {
        return None;
    }

    let resource_dir = app.path().resource_dir().ok()?;
    let api_dir = resource_dir.join("api");
    println!("[lifeos] Looking for API at: {:?}", api_dir);

    if api_dir.join("index.js").exists() {
        Some(api_dir)
    } else {
        eprintln!("[lifeos] API bundle not found at {:?}", api_dir);
        None
    }
}

fn setup_api(app: &App<Wry>) -> Option<Child> {
    if cfg!(debug_assertions) {
        eprintln!("[lifeos] Dev mode — expecting API already running on :4000");
        wait_for_api();
        None
    } else {
        let api_dir = find_api_dir(app)?;
        let child = start_api(&api_dir);
        wait_for_api();
        child
    }
}

const LOCAL_URL: &str = "http://localhost:4000";

fn resolve_remote_url() -> Option<String> {
    if let Ok(v) = std::env::var("LIFOOS_SERVER") {
        let v = v.trim().to_string();
        if !v.is_empty() {
            return Some(v);
        }
    }

    let exe_dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    let config = exe_dir.join("lifeos-server.txt");
    if let Ok(content) = std::fs::read_to_string(&config) {
        let v = content.lines().next().unwrap_or("").trim().to_string();
        if !v.is_empty() {
            return Some(v);
        }
    }

    None
}

fn ensure_url_scheme(url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else {
        format!("http://{url}")
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let remote = resolve_remote_url().map(|u| ensure_url_scheme(&u));
            let (server_url, child) = match remote {
                Some(url) => {
                    println!("[lifeos] Remote mode — server: {}", url);
                    (url, None)
                }
                None => {
                    let child = setup_api(app);
                    (LOCAL_URL.to_string(), child)
                }
            };

            if let Some(c) = child {
                app.manage(ApiProcess(Mutex::new(Some(c))));
            }

            let mut allowed_hosts = vec!["localhost".to_string(), "127.0.0.1".to_string()];
            if let Ok(parsed) = url::Url::parse(&server_url) {
                if let Some(host) = parsed.host_str() {
                    allowed_hosts.push(host.to_string());
                }
            }

            let _window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(server_url.parse().unwrap()),
            )
            .title("LifeOS")
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .center()
            .resizable(true)
            .on_navigation(move |url| {
                let host = url.host_str().unwrap_or("");
                if allowed_hosts.iter().any(|h| h == host) {
                    return true;
                }
                let url_str = url.as_str().to_string();
                std::thread::spawn(move || {
                    #[cfg(target_os = "windows")]
                    {
                        let _ = Command::new("cmd")
                            .args(["/c", "start", &url_str])
                            .spawn();
                    }
                    #[cfg(not(target_os = "windows"))]
                    {
                        eprintln!("[lifeos] external link blocked (open helper not configured): {}", url_str);
                    }
                });
                false
            })
            .build()?;

            println!("[lifeos] Window created, loading {}", server_url);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<ApiProcess>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(ref mut child) = *guard {
                            let _ = child.kill();
                            let _ = child.wait();
                            println!("[lifeos] API stopped");
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
