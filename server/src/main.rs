use actix_files::Files;
use actix_web::{web, App, HttpServer};
use std::{
    sync::{Arc, Mutex},
};

pub mod config;
pub mod model;
pub mod packet;
pub mod terrain;

pub mod endpoints {
    pub mod new_game;
    pub mod game;
    pub mod ws;
}

use model::{ServerState, SharedState};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let address = "0.0.0.0";
    let port = 8080;

    println!("Starting HexHavoc on http://{address}:{port}");

    let state: SharedState = Arc::new(Mutex::new(ServerState::new()));

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(state.clone()))
            .service(endpoints::new_game::create_new_game)
            .service(endpoints::game::game)
            .service(endpoints::ws::ws)
            .service(
                Files::new("/", "client/dist")
                    .prefer_utf8(true)
                    .index_file("index.html"),
            )
    })
    .bind((address, port))?
    .run()
    .await
}
