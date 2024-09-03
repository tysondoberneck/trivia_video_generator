import os
import re
import json
import pickle
import google.auth
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv
import time

# Load environment variables from .env file
load_dotenv()

# Set up OAuth 2.0 credentials
CLIENT_ID = os.getenv("CLIENT_ID")
PROJECT_ID = os.getenv("PROJECT_ID")
AUTH_URI = os.getenv("AUTH_URI")
TOKEN_URI = os.getenv("TOKEN_URI")
AUTH_PROVIDER_CERT_URL = os.getenv("AUTH_PROVIDER_CERT_URL")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']

def get_authenticated_service():
    creds = None
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_config({
                "web": {
                    "client_id": CLIENT_ID,
                    "project_id": PROJECT_ID,
                    "auth_uri": AUTH_URI,
                    "token_uri": TOKEN_URI,
                    "auth_provider_x509_cert_url": AUTH_PROVIDER_CERT_URL,
                    "client_secret": CLIENT_SECRET,
                    "redirect_uris": ["http://localhost:8080/"]
                }
            }, SCOPES)
            creds = flow.run_local_server(port=8080)
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    return build('youtube', 'v3', credentials=creds)

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

def upload_video(youtube, video_file, metadata):
    body = dict(
        snippet=dict(
            title=metadata['title'],
            description=metadata['description'],
            tags=metadata['tags'],
            categoryId=metadata['category_id']
        ),
        status=dict(
            privacyStatus='public',  # Set the video to public
            selfDeclaredMadeForKids=False  # Automatically set "Not made for kids"
        )
    )

    try:
        print(f"Uploading video: {video_file}")
        print(f"Video metadata: {json.dumps(body, indent=2)}")
        
        insert_request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=video_file
        )
        response = insert_request.execute()
        print(f"Uploaded video with ID: {response['id']}")
        print(f"Video status: {response['status']}")
    except HttpError as e:
        print(f"An HTTP error {e.resp.status} occurred:\n{e.content}")

class VideoHandler(FileSystemEventHandler):
    def __init__(self, youtube):
        self.youtube = youtube

    def on_created(self, event):
        if event.is_directory:
            return
        if event.src_path.endswith('.mp4'):
            print(f"New video file detected: {event.src_path}")
            self.process(event.src_path)

    def process(self, video_file):
        metadata_file = os.path.join('metadata', f"{os.path.splitext(os.path.basename(video_file))[0]}.json")

        # Delay to ensure metadata file exists
        time.sleep(0.5)
        if not os.path.exists(metadata_file):
            print(f"Metadata file not found for {video_file}")
            return
        
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # Generate the correct title using parse_video_title
        metadata['title'] = parse_video_title(video_file)

        upload_video(self.youtube, video_file, metadata)
        # os.remove(video_file)
        # os.remove(metadata_file)
        # print(f"Uploaded and removed {video_file} and {metadata_file}")

def start_monitoring():
    youtube = get_authenticated_service()
    event_handler = VideoHandler(youtube)
    observer = Observer()
    observer.schedule(event_handler, path='completed_videos', recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Interrupted by user")
        observer.stop()
    observer.join()

if __name__ == '__main__':
    start_monitoring()
