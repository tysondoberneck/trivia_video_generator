from moviepy.editor import ImageClip, AudioFileClip, CompositeVideoClip, ColorClip, concatenate_videoclips
from moviepy.audio.AudioClip import concatenate_audioclips
from PIL import Image, ImageDraw, ImageFont
import numpy as np
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

def create_video(question, options, answer, question_audio_path, options_intro_audio_path, options_audio_path, answer_audio_path, output_filename, is_true_false):
    try:
        print(f"Creating video: {output_filename}")

        question_audio_clip = AudioFileClip(question_audio_path)
        options_intro_audio_clip = AudioFileClip(options_intro_audio_path)
        answer_audio_clip = AudioFileClip(answer_audio_path)
        duration_question = question_audio_clip.duration
        duration_options_intro = options_intro_audio_clip.duration
        duration_answer = answer_audio_clip.duration

        if not is_true_false:
            options_audio_clip = AudioFileClip(options_audio_path)
            duration_options = options_audio_clip.duration
        else:
            options_audio_clip = None
            duration_options = 0

        bg_clip = ColorClip(size=(1080, 1920), color=(255, 255, 255), duration=duration_question + duration_options_intro + duration_options + duration_answer)

        question_image = "media/question_image.png"
        options_image = "media/options_image.png"
        answer_image = "media/answer_image.png"

        create_text_image(question, question_image)
        create_text_image("The options are:", options_image)
        create_text_image(options, options_image)
        create_text_image(answer, answer_image)

        question_clip = ImageClip(question_image, duration=duration_question).set_position('center')
        options_intro_clip = ImageClip(options_image, duration=duration_options_intro).set_start(duration_question).set_position('center')
        options_clip = ImageClip(options_image, duration=duration_options).set_start(duration_question + duration_options_intro).set_position('center')
        answer_clip = ImageClip(answer_image, duration=duration_answer).set_start(duration_question + duration_options_intro + duration_options).set_position('center').crossfadein(1)

        audio_clips = [question_audio_clip, options_intro_audio_clip, options_audio_clip, answer_audio_clip]
        audio_clips = [clip for clip in audio_clips if clip is not None]  # Filter out None values
        concatenated_audio = concatenate_audioclips(audio_clips)

        video = CompositeVideoClip([bg_clip, question_clip, options_intro_clip, options_clip, answer_clip]).set_audio(concatenated_audio)

        video.write_videofile(output_filename, fps=24)

        os.remove(question_image)
        os.remove(options_image)
        os.remove(answer_image)
    except Exception as e:
        print(f"Error creating video: {e}")
        raise

if __name__ == "__main__":
    try:
        if len(sys.argv) != 10:
            print("Usage: python create_video.py <question_file_path> <options_file_path> <answer_file_path> <question_audio_path> <options_intro_audio_path> <options_audio_path> <answer_audio_path> <output_filename> <is_true_false>")
            sys.exit(1)

        question_file_path = sys.argv[1]
        options_file_path = sys.argv[2]
        answer_file_path = sys.argv[3]
        question_audio_path = sys.argv[4]
        options_intro_audio_path = sys.argv[5]
        options_audio_path = sys.argv[6]
        answer_audio_path = sys.argv[7]
        output_filename = sys.argv[8]
        is_true_false = sys.argv[9].lower() == 'true'

        print("Reading question, options, and answer from files")
        with open(question_file_path, 'r') as file:
            question = file.read()
        with open(options_file_path, 'r') as file:
            options = file.read()
        with open(answer_file_path, 'r') as file:
            answer = file.read()

        create_video(question, options, answer, question_audio_path, options_intro_audio_path, options_audio_path, answer_audio_path, output_filename, is_true_false)

        for audio_file in [question_audio_path, options_intro_audio_path, options_audio_path, answer_audio_path]:
            os.remove(audio_file)
    except Exception as e:
        print(f"Error in main: {e}")
        raise
