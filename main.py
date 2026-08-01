from fastapi import FastAPI
from starlette.websockets import WebSocket, WebSocketDisconnect
from uvicorn.protocols.utils import ClientDisconnected

from tts.services import audio_bytes_to_file, audio_file_to_text, save_transcribed_text

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}


@app.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    print("Client connected")

    try:

        while True:
            print("Waiting for message...")

            message = await websocket.receive()

            print(message['type'])

            if message["type"] == "websocket.receive":

                print("Received bytes")
                # data = await websocket.receive_text()

                # await websocket.send_text(f"Message text was: {data}")

                audio_bytes = message["bytes"]

                audio_file = await audio_bytes_to_file(audio_bytes)

                transcribed_text = await audio_file_to_text(audio_file)

                print(transcribed_text)

                await websocket.send_text(transcribed_text)

                # await save_transcribed_text(transcribed_text)
            elif message["text"]["type"] == "close_connection":
                print("Client disconnected")
                await websocket.close()
            else:
                raise ValueError("Invalid message")

    except ClientDisconnected as e:
        print(f"Client disconnected: {e}")
    except WebSocketDisconnect as e:
        print(f"Websocket disconnected: {e}")
