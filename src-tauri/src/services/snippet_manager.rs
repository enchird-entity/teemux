use crate::models::snippet::Snippet;
use std::sync::{Arc, Mutex};
use tauri::Window;

pub struct SnippetManager {
  snippets: Arc<Mutex<Vec<Snippet>>>,
}

impl SnippetManager {
  pub fn new() -> Self {
    SnippetManager {
      snippets: Arc::new(Mutex::new(Vec::new())),
    }
  }

  pub fn run_snippet(
    &self,
    snippet: &Snippet,
    terminal_id: &str,
    window: Window,
  ) -> Result<bool, String> {
    match window.emit(
      "terminal:data",
      &serde_json::json!({
          "terminalId": terminal_id,
          "data": format!("{}\n", snippet.command),
      }),
    ) {
      Ok(_) => Ok(true),
      Err(err) => {
        eprintln!("Failed to run snippet: {}", err);
        Err(format!("Failed to run snippet: {}", err))
      }
    }
  }

  pub async fn run_snippets_on_connect(
    &self,
    snippet_ids: Vec<String>,
    terminal_id: &str,
    window: Window,
  ) -> Result<(), String> {
    let snippets = self.snippets.lock().unwrap();

    // Filter snippets that should run on connect
    let snippets_to_run: Vec<&Snippet> = snippets
      .iter()
      .filter(|s| snippet_ids.contains(&s.id) && s.run_on_connect)
      .collect();

    // Run each snippet with a small delay between them
    for snippet in snippets_to_run {
      self.run_snippet(snippet, terminal_id, window.clone())?;
      // Small delay to ensure commands execute in order
      tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    Ok(())
  }
}
