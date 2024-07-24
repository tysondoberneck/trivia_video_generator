from moviepy.editor import ImageClip, AudioFileClip, CompositeVideoClip, ColorClip
import sys
import os
from utils import create_text_image  # Import the shared function

def create_intro_outro_video(text, audio_path, output_filename, size=(1080, 1920), fontsize=100, padding=100):
    try:
        print(f"Creating intro/outro video: {output_filename}")

        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration

        bg_clip = ColorClip(size=size, color=(255, 255, 255), duration=duration)
        text_image = "media/text_image.png"

        create_text_image(text, text_image, size=size, fontsize=fontsize, padding=padding)  # Use the shared function

        text_clip = ImageClip(text_image, duration=duration).set_position('center')

        video = CompositeVideoClip([bg_clip, text_clip]).set_audio(audio_clip)

        video.write_videofile(output_filename, fps=24)

        os.remove(text_image)
    except Exception as e:
        print(f"Error creating intro/outro video: {e}")
        raise

if __name__ == "__main__":
    try:
        if len(sys.argv) != 4:
            print("Usage: python create_intro_outro_video.py <text> <audio_path> <output_filename>")
            sys.exit(1)

        text = sys.argv[1]
        audio_path = sys.argv[2]
        output_filename = sys.argv[3]

        create_intro_outro_video(text, audio_path, output_filename)
    except Exception as e:
        print(f"Error in main: {e}")
        raise
