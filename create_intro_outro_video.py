from moviepy.editor import ImageClip, AudioFileClip, CompositeVideoClip, ColorClip
from PIL import Image, ImageDraw, ImageFont
import sys
import os

def create_text_image(text, image_filename, size=(1080, 1920), fontsize=50):
    try:
        print(f"Creating text image: {image_filename}")
        img = Image.new('RGB', size, color=(255, 255, 255))
        d = ImageDraw.Draw(img)
        font = ImageFont.truetype("arial.ttf", fontsize)

        lines = []
        width, height = size
        max_width = width * 0.9

        words = text.split(' ')
        line = ''
        for word in words:
            test_line = f"{line} {word}".strip()
            test_bbox = d.textbbox((0, 0), test_line, font=font)
            test_width = test_bbox[2] - test_bbox[0]
            if test_width <= max_width:
                line = test_line
            else:
                lines.append(line)
                line = word
        lines.append(line)

        total_text_height = sum([d.textbbox((0, 0), line, font=font)[3] - d.textbbox((0, 0), line, font=font)[1] for line in lines])
        current_y = (height - total_text_height) / 2

        for line in lines:
            text_bbox = d.textbbox((0, 0), line, font=font)
            textwidth, textheight = text_bbox[2] - text_bbox[0], text_bbox[3] - text_bbox[1]
            x = (width - textwidth) / 2
            d.text((x, current_y), line, fill=(0, 0, 0), font=font)
            current_y += textheight

        img.save(image_filename)
    except Exception as e:
        print(f"Error creating text image: {e}")
        raise

def create_intro_outro_video(text, audio_path, output_filename):
    try:
        print(f"Creating intro/outro video: {output_filename}")

        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration

        bg_clip = ColorClip(size=(1080, 1920), color=(255, 255, 255), duration=duration)

        text_image = "text_image.png"
        create_text_image(text, text_image)

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
