from faster_whisper import WhisperModel

model = WhisperModel("small")
segments, info = model.transcribe("audio/malaria.m4a")

for segment in segments:
    print(segment.text)
