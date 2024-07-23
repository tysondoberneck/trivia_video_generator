import os
import json
import sys

def generate_metadata(video_filename):
    # Generate metadata based on the video filename
    base_name = os.path.basename(video_filename)
    video_name, _ = os.path.splitext(base_name)
    title = video_name.replace('_', ' ').title()
    
    metadata = {
        "title": title,
        "description": f"This is the description for {title}.",
        "tags": [
            "trivia",
            "quiz",
            "fun"
        ],
        "category_id": "22",  # Change to appropriate category ID
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
