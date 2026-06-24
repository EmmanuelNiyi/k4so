from ollama import Client
from pathlib import Path

client = Client()
path = Path("response.md")
path.write_text("", encoding="utf-8")

messages = [
    {
        "role": "system",
        # "content": "You are a medical scribe. Produce a SOAP note.",
        "content": "You are a general purpose assistant"
    },
    {
        "role": "user",
        "content": 'what does the term scribe mean'
    }
]

stream = client.chat(
    model="qwen3:4b",
    messages=messages,
    stream=True
)

with path.open("a", encoding="utf-8") as f:
    for chunk in stream:
        text = chunk["message"]["content"]
        print(text, end="", flush=True)  # show output as it arrives
        f.write(text)
        f.flush()  # optional
