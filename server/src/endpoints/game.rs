use actix_web::{get, web, HttpResponse, Responder, Result};

use crate::model::SharedState;

#[get("/game/{name}")]
async fn game(
    name: web::Path<String>,
    state: web::Data<SharedState>,
) -> Result<impl Responder> {
    let name = name.into_inner();
    let state = state.lock().unwrap();

    if state.game_ids_by_name.get(&name).is_some() {
        let mut html = std::fs::read_to_string("./client/dist/game.html")?;
        
        html = html.replace(r#"src="./game-"#, r#"src="/game-"#);

        Ok(HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(html))
    } else {
        Ok(HttpResponse::SeeOther()
            .append_header((
                "Location",
                format!("/?error=game-not-found&game_name={name}"),
            ))
            .finish()
            .into())
    }
}
