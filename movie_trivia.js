const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { OpenAI } = require('openai');
const he = require('he');


const apiKey = process.env.api_key;
const openai = new OpenAI({ apiKey });

// Categories object with shortened names
const categories = {
  'any': { id: 0, fullName: 'any' },
  'General Knowledge': { id: 9, fullName: 'General Knowledge' },
  'Books': { id: 10, fullName: 'Entertainment: Books' },
  'Film': { id: 11, fullName: 'Entertainment: Film' },
  'Music': { id: 12, fullName: 'Entertainment: Music' },
  'Musicals and Theatres': { id: 13, fullName: 'Entertainment: Musicals & Theatres' },
  'Television': { id: 14, fullName: 'Entertainment: Television' },
  'Video Games': { id: 15, fullName: 'Entertainment: Video Games' },
  'Board Games': { id: 16, fullName: 'Entertainment: Board Games' },
  'Science and Nature': { id: 17, fullName: 'Science & Nature' },
  'Computers': { id: 18, fullName: 'Science: Computers' },
  'Mathematics': { id: 19, fullName: 'Science: Mathematics' },
  'Mythology': { id: 20, fullName: 'Mythology' },
  'Sports': { id: 21, fullName: 'Sports' },
  'Geography': { id: 22, fullName: 'Geography' },
  'History': { id: 23, fullName: 'History' },
  'Politics': { id: 24, fullName: 'Politics' },
  'Art': { id: 25, fullName: 'Art' },
  'Celebrities': { id: 26, fullName: 'Celebrities' },
  'Animals': { id: 27, fullName: 'Animals' },
  'Vehicles': { id: 28, fullName: 'Vehicles' },
  'Comics': { id: 29, fullName: 'Entertainment: Comics' },
  'Gadgets': { id: 30, fullName: 'Science: Gadgets' },
  'Japanese Anime and Manga': { id: 31, fullName: 'Entertainment: Japanese Anime & Manga' },
  'Cartoon and Animations': { id: 32, fullName: 'Entertainment: Cartoon & Animations' },
};

// Specify category and number of questions
const selectedCategory = 'Mythology'; // Change category name here
const category = categories[selectedCategory];
const amount = 1; // Number of trivia questions
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
    
    exec(command, (error, stdout, stderr) => {
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
    fs.writeFileSync(listFilePath, listFileContent);

    console.log(`videos.txt content:\n${listFileContent}`); // Log the content of videos.txt

    const command = `ffmpeg -y -f concat -safe 0 -i ${listFilePath} -c copy ${outputFilename}`;
    console.log(`Executing command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
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

async function fetchTrivia() {
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
      exec(command, (error, stdout, stderr) => {
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

      // Create the options text for the audio with commas, "and", and "..."
      let triviaOptionsAudio = options.slice(0, -1).join(',,,,,, ') + ', and ' + options[options.length - 1] + '........';

      // Create the options text for the image without commas, "and", and "..."
      let triviaOptionsText = options.map(option => `- ${option}`).join('\n');

      const triviaAnswer = `The correct answer is: ${decodedCorrectAnswer}`;

      const filenames = [
        path.join(__dirname, `media/question_audio_${index + 1}.mp3`),
        path.join(__dirname, `media/options_intro_audio_${index + 1}.mp3`),
        path.join(__dirname, `media/options_audio_${index + 1}.mp3`),
        path.join(__dirname, `media/answer_audio_${index + 1}.mp3`)
      ];

      // Generate audio files
      await generateAudio(triviaQuestion, filenames[0]);
      await generateAudio(optionsIntro, filenames[1]);
      await generateAudio(triviaOptionsAudio, filenames[2]);
      await generateAudio(triviaAnswer, filenames[3]);

      // Create video for each trivia question
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
      exec(command, (error, stdout, stderr) => {
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

    // Generate metadata for the final video
    await new Promise((resolve, reject) => {
      const command = `python generate_metadata.py ${outputFilename}`;
      console.log(`Executing command: ${command}`);
      exec(command, (error, stdout, stderr) => {
        console.log(`Command stdout: ${stdout}`);
        console.log(`Command stderr: ${stderr}`);
        if (error) {
          console.error(`Error: ${error.message}`);
          return reject(error);
        }
        resolve();
      });
    });

    // Clean up individual video files and media folder
    videoFiles.forEach(file => fs.unlinkSync(file));
    fs.unlinkSync(path.join(__dirname, 'media', 'videos.txt'));
    fs.unlinkSync(path.join(__dirname, 'media', 'question_text.txt'));
    if (fs.existsSync(path.join(__dirname, 'media', 'options_intro_text.txt'))) {
      fs.unlinkSync(path.join(__dirname, 'media', 'options_intro_text.txt'));
    }
    if (fs.existsSync(path.join(__dirname, 'media', 'options_text.txt'))) {
      fs.unlinkSync(path.join(__dirname, 'media', 'options_text.txt'));
    }
    fs.unlinkSync(path.join(__dirname, 'media', 'answer_text.txt'));
    fs.unlinkSync(path.join(__dirname, 'media', 'intro_audio.mp3'));
    fs.unlinkSync(path.join(__dirname, 'media', 'outro_audio.mp3'));

    console.log(`Final video created: ${outputFilename}`);
  } catch (error) {
    console.error('Error fetching trivia:', error);
  }
}

fetchTrivia();
