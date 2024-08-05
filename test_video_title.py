import os
import re

def parse_video_title(video_file):
    basename = os.path.basename(video_file)
    name, _ = os.path.splitext(basename)

    # Extract the category name from the video file name
    category_match = re.match(r'(\w+)_', name)
    category = category_match.group(1).replace('_', ' ').title() if category_match else 'General'
    
    # Remove the word "Video" if it exists
    category = category.replace('Video', '').strip()

    # Find the part number
    part_match = re.search(r'(\d+)$', name)
    part_number = part_match.group(1) if part_match else '1'

    # Generate the proper title format
    title = f"{category} Trivia Part {part_number}"
    return title

if __name__ == "__main__":
    # Simulate the video file name (You can replace this with any video filename for testing)
    video_file = "completed_videos/computers_video_2.mp4"
    
    # Generate the title
    video_title = parse_video_title(video_file)
    
    # Print the result
    print(f"The title of the video will be: {video_title}")
