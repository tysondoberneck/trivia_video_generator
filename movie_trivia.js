const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { OpenAI } = require('openai');
const he = require('he');
const { google } = require('googleapis');
const express = require('express');

// Dynamic import of open module (since it's an ES module)
async function openUrl(url) {
  const { default: open } = await import('open');
  return open(url);
}

const apiKey = process.env.api_key;
const openai = new OpenAI({ apiKey });

// Express app for handling OAuth redirect
const app = express();
let authorizationCode = null;

// Categories object with shortened names
const categories = {
  'any': { id: 0, fullName: 'any', alias: 'Random Facts' },
  'General Knowledge': { id: 9, fullName: 'General Knowledge', alias: 'General Knowledge' },
  'Books': { id: 10, fullName: 'Entertainment: Books', alias: 'Books' },
  'Film': { id: 11, fullName: 'Entertainment: Film', alias: 'Film' },
  'Music': { id: 12, fullName: 'Entertainment: Music', alias: 'Music' },
  'Musicals and Theatres': { id: 13, fullName: 'Entertainment: Musicals & Theatres', alias: 'Musicals and Theatres' },
  'Television': { id: 14, fullName: 'Entertainment: Television', alias: 'Television' },
  'Video Games': { id: 15, fullName: 'Entertainment: Video Games', alias: 'Video Games' },
  'Board Games': { id: 16, fullName: 'Entertainment: Board Games', alias: 'Board Games' },
  'Science and Nature': { id: 17, fullName: 'Science & Nature', alias: 'Science and Nature' },
  'Computers': { id: 18, fullName: 'Science: Computers', alias: 'Computers' },
  'Mathematics': { id: 19, fullName: 'Science: Mathematics', alias: 'Mathematics' },
  'Mythology': { id: 20, fullName: 'Mythology', alias: 'Mythology' },
  'Sports': { id: 21, fullName: 'Sports', alias: 'Sports' },
  'Geography': { id: 22, fullName: 'Geography', alias: 'Geography' },
  'History': { id: 23, fullName: 'History', alias: 'History' },
  'Politics': { id: 24, fullName: 'Politics', alias: 'Politics' },
  'Art': { id: 25, fullName: 'Art', alias: 'Art' },
  'Celebrities': { id: 26, fullName: 'Celebrities', alias: 'Celebrities' },
  'Animals': { id: 27, fullName: 'Animals', alias: 'Animals' },
  'Vehicles': { id: 28, fullName: 'Vehicles', alias: 'Vehicles' },
  'Comics': { id: 29, fullName: 'Entertainment: Comics', alias: 'Comics' },
  'Gadgets': { id: 30, fullName: 'Science: Gadgets', alias: 'Gadgets' },
  'Japanese Anime and Manga': { id: 31, fullName: 'Entertainment: Japanese Anime & Manga', alias: 'Japanese Anime and Manga' },
  'Cartoon and Animations': { id: 32, fullName: 'Entertainment: Cartoon & Animations', alias: 'Cartoon and Animations' },
};

// Function to randomly select a category from the categories object
function getRandomCategory() {
  const categoryKeys = Object.keys(categories);
  const randomKey = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
  return categories[randomKey];
}

// Set up a random category to be used for trivia
const category = getRandomCategory();  // Select a random category each time
const selectedCategory = category.alias;

const amount = 3; // Number of trivia questions
const TRIVIA_URL = `https://opentdb.com/api.php?amount=${amount}&category=${category.id}&type=multiple`;

function decodeHtmlEntities(text) {
  return he.decode(text);  // Use he library to decode HTML entities
}

async function generateAudio(text, filename) {
  try {
    console.log(`Generating audio: ${filename}`);
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "fable",
      input: text
    });

    if (response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filename, buffer);
      console.log(`Audio content written to file: ${filename}`);
    } else {
      throw new Error("Audio content missing in response");
    }
  } catch (error) {
    console.error(`Error generating audio: ${error.message}`);
    throw error;
  }
}

function createVideo(question, options_intro, options, answer, filenames, isTrueFalse) {
  return new Promise((resolve, reject) => {
    const mediaDir = path.join(__dirname, 'media');
    const questionFilePath = path.join(mediaDir, 'question_text.txt');
    const optionsIntroFilePath = path.join(mediaDir, 'options_intro_text.txt');
    const optionsFilePath = path.join(mediaDir, 'options_text.txt');
    const answerFilePath = path.join(mediaDir, 'answer_text.txt');

    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir);
    }

    fs.writeFileSync(questionFilePath, question, 'utf8');
    fs.writeFileSync(optionsIntroFilePath, options_intro, 'utf8');
    if (!isTrueFalse) {
      fs.writeFileSync(optionsFilePath, options, 'utf8');
    }
    fs.writeFileSync(answerFilePath, answer, 'utf8');

    const command = `python create_video.py ${questionFilePath} ${optionsIntroFilePath} ${optionsFilePath} ${answerFilePath} ${filenames.join(' ')} media/trivia_video_${filenames[0].split('_').pop().split('.')[0]}.mp4 ${isTrueFalse}`;
    console.log(`Executing command: ${command}`);
    
    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      console.log(`Command stdout: ${stdout}`);
      console.log(`Command stderr: ${stderr}`);
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      resolve();
    });
  });
}

function concatenateVideos(videoFiles, outputFilename) {
  return new Promise((resolve, reject) => {
    const listFilePath = path.join(__dirname, 'media', 'videos.txt');
    const listFileContent = videoFiles.map(file => `file '${path.resolve(file)}'`).join('\n');
    fs.writeFileSync(listFilePath, listFileContent, 'utf8');

    console.log(`videos.txt content:\n${listFileContent}`);

    const command = `ffmpeg -y -f concat -safe 0 -i ${listFilePath} -c copy ${outputFilename}`;
    console.log(`Executing command: ${command}`);
    
    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      console.log(`Command stdout: ${stdout}`);
      console.log(`Command stderr: ${stderr}`);
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      resolve();
    });
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getNextFinalVideoFilename(categoryName) {
  const completedDir = path.join(__dirname, 'completed_videos');
  if (!fs.existsSync(completedDir)) {
    fs.mkdirSync(completedDir);
  }

  let index = 1;
  let filename;
  do {
    filename = path.join(completedDir, `${categoryName.toLowerCase().replace(/ /g, '_')}_video_${index}.mp4`);
    index++;
  } while (fs.existsSync(filename));
  return filename;
}

// Google OAuth Setup
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const credentials = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  redirect_uris: ['http://localhost:8080'],
  project_id: process.env.PROJECT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_CERT_URL,
};

// Get authenticated service function
async function getAuthenticatedService() {
  const { client_id, client_secret } = credentials;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8080');

  let token;
  if (fs.existsSync('token.json')) {
    token = JSON.parse(fs.readFileSync('token.json'));
    oauth2Client.setCredentials(token);
  } else {
    const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    console.log(`Authorize this app by visiting this url: ${authUrl}`);
    await openUrl(authUrl); // Dynamically open the URL

    // Start express server to capture the authorization code
    const server = app.listen(8080, () => {
      console.log('Listening on port 8080...');
    });

    app.get('/', async (req, res) => {
      authorizationCode = req.query.code;
      res.send('Authorization successful! You can close this tab.');
      const { tokens } = await oauth2Client.getToken(authorizationCode);
      oauth2Client.setCredentials(tokens);
      fs.writeFileSync('token.json', JSON.stringify(tokens));
      console.log('Tokens saved successfully!');
      server.close(); // Close the server after receiving the code
    });
  }

  return google.youtube({ version: 'v3', auth: oauth2Client });
}

// Metadata generation function - uses the Python script
function generateMetadata(videoFilePath) {
  return new Promise((resolve, reject) => {
    const command = `python generate_metadata.py ${videoFilePath}`;
    console.log(`Executing metadata generation command: ${command}`);

    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error generating metadata: ${error.message}`);
        return reject(error);
      }

      console.log(`Metadata generated: ${stdout}`);
      const metadataFile = path.join('metadata', `${path.basename(videoFilePath, '.mp4')}.json`);

      if (fs.existsSync(metadataFile)) {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        resolve(metadata);
      } else {
        reject(new Error('Metadata file not found after generation.'));
      }
    });
  });
}

// Upload video to YouTube function
async function uploadVideo(videoFilePath, metadata) {
  const youtube = await getAuthenticatedService();
  const videoFileName = path.basename(videoFilePath);
  const videoTitle = metadata.title || videoFileName;

  const requestBody = {
    snippet: {
      title: videoTitle,
      description: metadata.description || 'Trivia video upload',
      tags: metadata.tags || ['Trivia'],
      categoryId: metadata.category_id || '28', // 28 = Science & Technology category
    },
    status: {
      privacyStatus: metadata.privacy_status || 'public',
    },
  };

  const videoStream = fs.createReadStream(videoFilePath);

  const res = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody,
    media: {
      body: videoStream,
    },
  });

  console.log(`Video uploaded to YouTube. Video ID: ${res.data.id}`);
}

// Fetch trivia, create video, and upload to YouTube
async function fetchTriviaAndUpload() {
  try {
    const response = await axios.get(TRIVIA_URL);
    const triviaQuestions = response.data.results;
    const videoFiles = [];

    console.log('Movie Trivia:');

    const introText = `Let's test how well you know ${selectedCategory}!`;
    const outroText = 'Thank you for watching! Comment below how many you answered correctly!';

    await generateAudio(introText, path.join(__dirname, 'media', 'intro_audio.mp3'));
    await generateAudio(outroText, path.join(__dirname, 'media', 'outro_audio.mp3'));

    // Create intro video
    await new Promise((resolve, reject) => {
      const command = `python create_intro_outro_video.py "${introText}" "media/intro_audio.mp3" "media/intro_video.mp4"`;
      console.log(`Executing command: ${command}`);
      exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
        console.log(`Command stdout: ${stdout}`);
        console.log(`Command stderr: ${stderr}`);
        if (error) {
          console.error(`Error: ${error.message}`);
          return reject(error);
        }
        resolve();
      });
    });

    for (const [index, questionData] of triviaQuestions.entries()) {
      const decodedQuestion = decodeHtmlEntities(questionData.question);
      const decodedCorrectAnswer = decodeHtmlEntities(questionData.correct_answer);
      const decodedIncorrectAnswers = questionData.incorrect_answers.map(decodeHtmlEntities);
      const options = [...decodedIncorrectAnswers, decodedCorrectAnswer].sort(() => Math.random() - 0.5);  // Shuffle options

      console.log(`Question ${index + 1}: ${decodedQuestion}`);
      console.log(`Options: ${options.join(', ')}`);
      console.log(`Correct Answer: ${decodedCorrectAnswer}`);
      console.log('---');

      let triviaQuestion = `Question ${index + 1}: ${decodedQuestion}`;
      let optionsIntro = 'The options are:';
      let triviaOptionsAudio = options.slice(0, -1).join(', ') + ', and ' + options[options.length - 1] + '...';
      let triviaOptionsText = options.map(option => `- ${option}`).join('\n');
      const triviaAnswer = `The correct answer is: ${decodedCorrectAnswer}`;

      const filenames = [
        path.join(__dirname, `media/question_audio_${index + 1}.mp3`),
        path.join(__dirname, `media/options_intro_audio_${index + 1}.mp3`),
        path.join(__dirname, `media/options_audio_${index + 1}.mp3`),
        path.join(__dirname, `media/answer_audio_${index + 1}.mp3`)
      ];

      await generateAudio(triviaQuestion, filenames[0]);
      await generateAudio(optionsIntro, filenames[1]);
      await generateAudio(triviaOptionsAudio, filenames[2]);
      await generateAudio(triviaAnswer, filenames[3]);

      await createVideo(triviaQuestion, optionsIntro, triviaOptionsText, triviaAnswer, filenames, false).catch(error => {
        console.error(`Failed to create video for question ${index + 1}: ${error.message}`);
        throw error;
      });

      videoFiles.push(path.join(__dirname, `media/trivia_video_${index + 1}.mp4`));
      await delay(1000); // Delay before next question
    }

    // Create outro video
    await new Promise((resolve, reject) => {
      const command = `python create_intro_outro_video.py "${outroText}" "media/outro_audio.mp3" "media/outro_video.mp4"`;
      console.log(`Executing command: ${command}`);
      exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
        console.log(`Command stdout: ${stdout}`);
        console.log(`Command stderr: ${stderr}`);
        if (error) {
          console.error(`Error: ${error.message}`);
          return reject(error);
        }
        resolve();
      });
    });

    const outputFilename = getNextFinalVideoFilename(selectedCategory);

    // Concatenate all videos into a single video
    await concatenateVideos([
      path.join(__dirname, 'media', 'intro_video.mp4'),
      ...videoFiles,
      path.join(__dirname, 'media', 'outro_video.mp4')
    ], outputFilename).catch(error => {
      console.error(`Failed to concatenate videos: ${error.message}`);
      throw error;
    });

    // Generate metadata for the final video using the Python script
    const metadata = await generateMetadata(outputFilename);

    // Upload the final video to YouTube
    await uploadVideo(outputFilename, metadata);

  } catch (error) {
    console.error('Error fetching trivia or uploading:', error);
  }
}

fetchTriviaAndUpload();
