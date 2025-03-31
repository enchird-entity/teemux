use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub command: String,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
} 