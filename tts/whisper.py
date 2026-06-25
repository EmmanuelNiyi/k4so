from faster_whisper import WhisperModel
from pathlib import Path

model = WhisperModel("small")
path = Path('transcript.md')
path.write_text("", encoding="utf-8")

segments, info = model.transcribe("audio/malaria.m4a")

# for segment in segments:
#     print(segment.text)


with path.open('a', encoding="utf-8") as f:
    for segment in segments:
        print(segment.text)
        f.write(segment.text)
        f.flush()
