use actix_web::{web, post, Responder};
use serde::Deserialize;

use crate::model::SharedState;

#[derive(Deserialize)]
struct NewGameForm {
    name: String,
    seed: u32,
}

#[post("/new_game")]
async fn create_new_game(
    web::Form(form): web::Form<NewGameForm>,
    state: web::Data<SharedState>
) -> impl Responder {
    let mut state = state.lock().unwrap();

    let name = &form.name;
    let seed = form.seed;

    if let Some(id) = state.game_ids_by_name.get(name) {
        web::Redirect::to(format!("/?error=game-found&game_name={name}&id={id}"))
            .see_other()
    } else {
        let _id = state.create_game(name, seed);

        web::Redirect::to(format!("/game/{name}"))
            .see_other()
    }
}