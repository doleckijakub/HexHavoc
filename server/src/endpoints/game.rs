use actix_files::NamedFile;
use actix_web::{HttpRequest, HttpResponse, Responder, Result, get, web};

use crate::model::SharedState;

#[get("/game/{name}")]
async fn game(
    req: HttpRequest,
    name: web::Path<String>,
    state: web::Data<SharedState>,
) -> Result<impl Responder> {
    let name = name.into_inner();
    let state = state.lock().await;

    if state.game_ids_by_name.contains_key(&name) {
        let file = NamedFile::open_async("./client/dist/game.html").await?;

        Ok(file.into_response(&req))
    } else {
        Ok(HttpResponse::SeeOther()
            .append_header((
                "Location",
                format!("/?error=game-not-found&game_name={name}"),
            ))
            .finish())
    }
}
