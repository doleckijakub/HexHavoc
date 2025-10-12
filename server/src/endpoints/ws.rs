use actix_web::{rt, web, get, Error, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt;
use uuid::Uuid;

use crate::model::{Client, SharedState};
use crate::packet::Packet;

#[get("/ws")]
async fn ws(
    req: HttpRequest,
    stream: web::Payload,
    state: web::Data<SharedState>,
) -> Result<HttpResponse, Error> {
    let (res, session, mut stream) = actix_ws::handle(&req, stream)?;

    let id = Uuid::new_v4();

    let client = Client {
        id,
        ws_session: session.clone(),
        player_data: None,
    };

    client.log("Created");

    {
        let mut locked_state = state.lock().unwrap();
        locked_state.clients.insert(id, client);
    }

    let state_clone = state.clone();

    rt::spawn(async move {
        while let Some(msg) = stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    let mut locked_state = state_clone.lock().unwrap();

                    if let Ok(packet) = serde_json::from_str::<Packet>(&text) {
                        if let Some(mut client) = locked_state.clients.remove(&id) {
                            client.recv(packet, &mut locked_state).await;
                            locked_state.clients.insert(id, client);
                        } else {
                            eprintln!("[WS] Missing client {}", id);
                        }
                    } else {
                        if let Some(client) = locked_state.clients.get(&id) {
                            client.elog(format!("Sent an unparsable packet: {}", text));
                        }
                    }
                }

                Ok(Message::Ping(msg)) => {
                    let mut locked_state = state_clone.lock().unwrap();
                    if let Some(client) = locked_state.clients.get_mut(&id) {
                        client.ws_session.pong(&msg).await.ok();
                    }
                }

                Ok(Message::Close(_)) | Err(_) => {
                    let mut locked_state = state_clone.lock().unwrap();
                    if let Some(client) = locked_state.clients.remove(&id) {
                        client.log("Disconnected");
                    }
                }

                _ => {}
            }
        }
    });

    Ok(res)
}
