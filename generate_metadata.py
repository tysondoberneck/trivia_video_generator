import os
import json

def generate_metadata(video_filename):
    # Extract the base name without extension
    basename = os.path.basename(video_filename)
    name, _ = os.path.splitext(basename)

    # Generate metadata
    metadata = {
        "title": name.replace('_', ' ').title(),
        "description": f"This is the description for {name.replace('_', ' ').title()}.",
        "tags": ["trivia", "quiz", "fun"],
        "category_id": "22",  # Example category ID for "People & Blogs"
        "privacy_status": "public"
    }

    # Save metadata to a JSON file
    metadata_filename = os.path.join('metadata', f"{name}.json")
    with open(metadata_filename, 'w') as metadata_file:
        json.dump(metadata, metadata_file)

    print(f"Metadata saved to {metadata_filename}")

if __name__ == "__main__":
    # Example usage
    video_filename = 'completed_videos/animals_video_1.mp4'  # Replace with actual video file path
    generate_metadata(video_filename)
