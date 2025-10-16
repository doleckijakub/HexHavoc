use actix_web::{Error, HttpRequest, HttpResponse, get, rt, web};
use actix_ws::Message;
use futures_util::StreamExt;
use std::sync::Arc;
use tokio::sync::Mutex;
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

    {
        let client = Client {
            id,
            ws_session: Arc::new(Mutex::new(session)),
            game: None,
        };

        client.log("Connected").await;

        let mut locked_state = state.lock().await;
        locked_state.clients.insert(id, client);
    }

    rt::spawn(async move {
        while let Some(msg) = stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(packet) = serde_json::from_str::<Packet>(&text) {
                        let client_opt = {
                            let locked_state = state.lock().await;
                            locked_state.clients.get(&id).cloned()
                        };

                        if let Some(mut client) = client_opt {
                            let mut locked_state = state.lock().await;
                            client.recv(packet, &mut locked_state).await;
                        } else {
                            eprintln!("[WS] Missing client {}", id);
                        }
                    } else {
                        let locked_state = state.lock().await;
                        if let Some(client) = locked_state.clients.get(&id)
                            && !text.is_empty()
                        {
                            client
                                .elog(format!("Sent an unparsable packet: {}", text))
                                .await;
                        }
                    }
                }

                Ok(Message::Ping(msg)) => {
                    let locked_state = state.lock().await;
                    if let Some(client) = locked_state.clients.get(&id) {
                        let mut ws = client.ws_session.lock().await;
                        ws.pong(&msg).await.ok();
                    }
                }

                Ok(Message::Close(_)) | Err(_) => {
                    let mut locked_state = state.lock().await;
                    if let Some(client) = locked_state.clients.remove(&id) {
                        client.log("Disconnected").await;
                    }
                }

                _ => {}
            }
        }
    });

    Ok(res)
}
