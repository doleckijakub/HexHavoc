use actix_web::{web, get, HttpResponse, Result};
use std::path::PathBuf;

use crate::model::SharedState;

#[get("/game/{name}")]
async fn game(
    name: web::Path<String>,
    state: web::Data<SharedState>
) -> Result<HttpResponse> {
    let name = name.into_inner();
    let state = state.lock().unwrap();

    if let Some(game_id) = state.game_ids_by_name.get(&name) {
        let path: PathBuf = "./client/public/game/index.html".into();
        let mut html = std::fs::read_to_string(&path)?;

        html = html.replace("{{ GAME_ID }}", &game_id.to_string());

        Ok(HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(html))
    } else {
        Ok(HttpResponse::SeeOther()
            .append_header(("Location", format!("/?error=game-not-found&game_name={name}")))
            .finish()
        )
    }
}