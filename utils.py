from PIL import Image, ImageDraw, ImageFont

def create_text_image(text, image_filename, size=(1080, 1920), fontsize=100, padding=100):
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

        img_with_padding = Image.new('RGB', (width + padding*2, height + padding*2), color=(255, 255, 255))
        img_with_padding.paste(img, (padding, padding))
        img_with_padding.save(image_filename)
    except Exception as e:
        print(f"Error creating text image: {e}")
        raise
