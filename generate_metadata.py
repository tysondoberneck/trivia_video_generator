import os
import json
import sys
import re

# Function to parse video title from the filename
def parse_video_title(video_file):
    basename = os.path.basename(video_file)
    name, _ = os.path.splitext(basename)

    # Extract the category name from the video file name
    category_match = re.match(r'(\w+)_', name)
    category = category_match.group(1).replace('_', ' ').title() if category_match else 'General'
    
    # Remove the word "Video" if it exists
    category = category.replace('Video', '').strip()

    # Find the part number from the video file name
    part_match = re.search(r'(\d+)$', name)
    part_number = part_match.group(1) if part_match else '1'

    # Generate the proper title format
    title = f"{category} Trivia Part {part_number}"
    return title, part_number, category

def generate_metadata(video_filename):
    # Use the parse_video_title function to extract the title, part number, and category
    title, part_number, category = parse_video_title(video_filename)

    # Generate a dynamic description based on the parsed category and part number
    description = (
        f"Get ready for a fun and challenging round of {category} trivia! "
        f"Test your knowledge and see how many questions you can get right. "
        f"Don't forget to like, comment, and subscribe for more trivia content! "
        f"This is part {part_number} of our {category} trivia series. Stay tuned for more!"
    )

    # Create metadata dictionary
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

    # Save metadata to a JSON file in the metadata folder
    video_name, _ = os.path.splitext(os.path.basename(video_filename))
    metadata_filename = f"metadata/{video_name}.json"
    os.makedirs('metadata', exist_ok=True)
    with open(metadata_filename, 'w') as f:
        json.dump(metadata, f)
    
    print(f"Metadata saved to {metadata_filename}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python generate_metadata.py <video_filename>")
        sys.exit(1)

    video_filename = sys.argv[1]
    generate_metadata(video_filename)
