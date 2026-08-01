import wave
import io

import uuid
from pathlib import Path

from tts.whisper import model


def generate_unique_id():
    """
    Generates a unique ID using UUID4 (random-based).
    Returns:
        str: A string representation of the UUID.
    """
    return str(uuid.uuid4())


async def audio_bytes_to_file(audio_bytes: bytes):
    # Example: Replace with your actual WAV bytes
    wav_bytes = audio_bytes
    audio_path = f"{generate_unique_id()}.wav"
    print(f"Writing audio file: {audio_path}")

    try:
        # Write bytes to a file
        with open(audio_path, "wb") as f:
            f.write(wav_bytes)

        print(f"WAV file created: {audio_path}")

    except Exception as e:
        print(f"Error writing WAV file: {e}")

    return audio_path


async def audio_file_to_text(audio_file: str):
    print(f"Reading audio file: {audio_file}")

    transcript_bit = ""

    segments, info = model.transcribe(audio_file)

    for segment in segments:
        transcript_bit += segment.text

    # delete audiofile

    return transcript_bit


async def save_transcribed_text(text: str):
    print(f"Saving transcribed text: {text}")
    path = Path('transcript.md')
    path.write_text("", encoding="utf-8")

    with path.open('a', encoding="utf-8") as f:
        f.write(text)
        f.flush()
