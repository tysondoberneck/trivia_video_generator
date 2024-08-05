import os
import json
import sys
import re

def get_next_part_number(title_base):
    # Find the highest part number in the existing metadata files
    metadata_dir = 'metadata'
    part_numbers = []
    if os.path.exists(metadata_dir):
        for filename in os.listdir(metadata_dir):
            if filename.endswith('.json') and title_base.lower() in filename.lower():
                match = re.search(r'Part (\d+)', filename)
                if match:
                    part_numbers.append(int(match.group(1)))
    return max(part_numbers) + 1 if part_numbers else 1

def generate_metadata(video_filename):
    base_name = os.path.basename(video_filename)
    video_name, _ = os.path.splitext(base_name)

    # Extract the category name dynamically from the video name
    # Assuming the video_name format is something like 'computers_video_1'
    category_match = re.match(r'(\w+)_', video_name)
    category = category_match.group(1).replace('_', ' ').title() if category_match else 'General'

    # Remove the word "Video" if it exists
    category = category.replace('Video', '').strip()

    # Adjust the title format
    title_base = f'{category} Trivia'
    part_number = get_next_part_number(title_base)
    title = f'{title_base} Part {part_number}'

    # Generate a dynamic description
    description = (
        f"Get ready for a fun and challenging round of {category} trivia! "
        f"Test your knowledge and see how many questions you can get right. "
        f"Don't forget to like, comment, and subscribe for more trivia content! "
        f"This is part {part_number} of our {category} trivia series. Stay tuned for more!"
    )

    metadata = {
        "title": title,
        "description": description,
        "tags": [
            "trivia",
            "quiz",
            f"{category.lower()}",
            "fun",
            "challenge"
        ],
        "category_id": "27",
        "privacy_status": "public"  # Set the desired privacy status
    }

    metadata_filename = f"metadata/{video_name}.json"
    with open(metadata_filename, 'w') as f:
        json.dump(metadata, f)
    print(f"Metadata saved to {metadata_filename}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python generate_metadata.py <video_filename>")
        sys.exit(1)

    video_filename = sys.argv[1]
    generate_metadata(video_filename)
