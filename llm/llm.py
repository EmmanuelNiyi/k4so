from ollama import Client
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent

client = Client()

base_prompt_path = Path("base_prompt")
base_prompt = base_prompt_path.read_text(encoding="utf-8")

base_prompt_path = Path("prose_prompt")
prose_prompt = base_prompt_path.read_text(encoding="utf-8")

transcript_path = Path(f"{BASE_DIR}/tts/transcript.md")
transcript = transcript_path.read_text()

# Create structured response
response_path = Path("response.md")
response_path.write_text("", encoding="utf-8")

# Create prose_response.md
prose_path = Path("prose.md")
prose_path.write_text("", encoding="utf-8")

messages = [
    {
        "role": "system",
        "content": base_prompt,
        # "content": "You are a general purpose assistant"
    },
    {
        "role": "user",
        "content": transcript
    }
]

stream = client.chat(
    model="qwen3:4b",
    messages=messages,
    stream=True
)


response_text = []
with response_path.open("a", encoding="utf-8") as f:
    for chunk in stream:
        text = chunk["message"]["content"]
        print(text, end="", flush=True)  # show output as it arrives
        f.write(text)
        f.flush()  # optional

        response_text.append(text)


"""TO PROSE"""
response_text = "".join(response_text)
messages[0]['content'] = prose_prompt
messages[1]['content'] = response_text


prose_stream = client.chat(
    model="qwen3:4b",
    messages=messages,
    stream=True
)


with prose_path.open("a", encoding="utf-8") as f:
    for chunk in prose_stream:
        text = chunk["message"]["content"]
        print(text, end="", flush=True)  # show output as it arrives
        f.write(text)
        f.flush()  # optional
