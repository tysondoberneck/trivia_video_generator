# Use an official Node.js runtime as a parent image
FROM node:16

# Install Python and ffmpeg for video processing and upload tasks
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg

# Set the working directory in the container
WORKDIR /app

# Copy package.json and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy the Python requirements and install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 8080 (optional, for monitoring purposes)
EXPOSE 8080

# Command to run both the Node.js script and the Python listener in parallel
CMD ["sh", "-c", "node movie_trivia.js && python3 upload_video.py"]
