// deno-lint-ignore-file no-window no-window-prefix
import { RandomSong, APPWRITE, html } from "./constants.ts"
import * as fn from "./functions.ts"

//#region VARIABLE DELCARATIONS

// Global Variables
let playlistId = '';
let _artistId: string;
let _albumId: string;
let correctAnswer = '';
let gamemode = 'playlists';
let lastSong: RandomSong;
let guessCount: number;
let startTime: number;
let _startTime1: number;
let _startTime2: number;
let _startTime3: number;
let songLength: number;
let guesses: string[];
let score = 0;
let lives = 3;
let songCount = 0;
let finishedRound = false;
let finishedGame = false;
let isPlaying = false;
let isGettingSource = false;
let isGettingNewSong = false;
let isGettingSourceUpdate = false;

//#endregion

//#region GAME LOGIC

// Initialize the game by fetching a random song from the playlist
async function initializeGame() {
    html.button_NextSong.disabled = false
    html.button_SubmitGuess.disabled = true;
    html.button_Skip.disabled = true;
    html.input_Guess.disabled = true;

    if (isGettingNewSong) {
        return
    }

    isGettingNewSong = true

    if (!finishedRound && !finishedGame) {
        loseLife(1)
    }

    if (lives <= 0) {
        showResults();
        revealSongDetails()
        setLives(3)
        finishedGame = true
        html.button_SubmitGuess.disabled = true;
        html.button_Skip.disabled = true;
        html.input_Guess.disabled = true;
        isGettingNewSong = false
        return;
    }

    if (finishedGame) {
        setLives(3)
        setScore(0)
        finishedGame = false
    }

    finishedRound = false

    let randomSong: RandomSong;
    let gotSong = false

    // Hide the cover and song name
    html.text_SongName.style.visibility = 'hidden';
    html.image_SongArtwork.style.visibility = 'hidden';
    html.text_Status.innerText = 'wait wait wait...';

    do {
        if (gotSong) break
        switch (gamemode) {
            case 'playlists':
                randomSong = await fn.randomSongFromPlaylist("https://open.spotify.com/playlist/" + playlistId);
                gotSong = true
                break;
        }
    } while (lastSong === randomSong)

    lastSong = randomSong;

    // Update UI elements with song details
    correctAnswer = randomSong?.artists as string + " - " + randomSong?.name as string;
    html.text_SongName.innerText = `${randomSong?.artists as string} - ${randomSong?.name as string}`;
    html.text_SongName.setAttribute("href", randomSong?.spotify_url as string);
    html.image_SongArtwork.setAttribute("src", randomSong?.image as string);

    html.text_Status.innerText = '';

    // Guess inputs
    html.input_Guess.disabled = false
    html.button_SubmitGuess.disabled = false;
    html.button_Skip.disabled = false;
    html.button_Replay.disabled = false;
    html.input_Guess.value = '';
    html.text_GuessLabel.innerText = "guess 1 (0.5 seconds):";

    guessCount = 0;
    guesses = [];
    songLength = 0.5;
    songCount++;

    // Set up audio preview
    html.source_PreviewUrl.src = await randomSong?.preview_url as string;
    await html.audio_Audio.load();

    startTime = Math.random() * 29; // Random start time for audio
    _startTime1 = startTime

    // Play audio and pause after a short duration
    html.audio_Audio.addEventListener('loadedmetadata', () => {
        playAndPauseAudio(songLength, startTime); // Play for 0.5 seconds by default
    });

    // If after 5 attempts no valid song is found, show an error
    if (randomSong == undefined) {
        html.text_Status.innerText = "Please try a different playlist!";
        html.image_SongArtwork.setAttribute("src", ""); // Clear any image
    }

    isGettingSource = false
    isGettingNewSong = false

    fn.setupAutocomplete()
}

// Function to play audio and pause after a given duration
function playAndPauseAudio(duration: number, overrideStartTime?: number) {
    if (isPlaying) {
        html.audio_Audio.pause();
        isPlaying = false;
        return;
    }  // Pause song if already playing
    isPlaying = true;
    if (startTime < 30) {
        html.audio_Audio.currentTime = startTime;
    }
    if (overrideStartTime) {
        html.audio_Audio.currentTime = overrideStartTime;
    }
    setTimeout(() => {
        html.audio_Audio.play().then(() => {
            setTimeout(() => {
                html.audio_Audio.pause();
                isPlaying = false;
            }, duration * 1000);
        }).catch(error => {
            console.error("Error playing audio:", error);
            isPlaying = false;
        });
    }, 50);
}

// Function to add playlist to the dropdown and store it in local storage
function addPlaylistToDropdown(playlistId: string, playlistName: string) {
    // Ensure playlistName is valid (not undefined or empty)
    if (!playlistName) {
        console.error('Invalid playlist name');
        return;
    }

    // Check if the playlist is already in the dropdown
    const existingOption = Array.from(html.select_SourceDropdown.options).find(option => option.value === playlistId);
    if (existingOption) {
        return; // Don't add duplicates
    }

    const option = document.createElement('option');
    option.value = playlistId;
    option.text = playlistName;
    html.select_SourceDropdown.add(option);

    // Store the playlist in local storage
    const storedPlaylists = JSON.parse(localStorage.getItem(gamemode) || '[]');
    const isPlaylistStored = storedPlaylists.some((playlist: { id: string }) => playlist.id === playlistId);
    if (isPlaylistStored) {
        return; // Don't add duplicates to local storage
    }

    storedPlaylists.push({ id: playlistId, name: playlistName, highscore: 0 });
    localStorage.setItem(gamemode, JSON.stringify(storedPlaylists));
}

//#region SCORING

// Function to update the displayed score
function updateScoreDisplay() {
    html.text_Score.textContent = `scoreee: ${score}`;
}

// Function to update the displayed highscore
function updateHighscoreDisplay(highscore: number) {
    html.text_Highscore.textContent = `best: ${highscore}`;
}

// Function to update the highscore if the current score is higher
function updateHighscore() {
    const currentHighscore = getPlaylistHighscore(playlistId);
    if (score > currentHighscore) {
        updateHighscoreDisplay(score);
        updatePlaylistHighscore(playlistId, score)
    }
}

// Function to add to the score and update the highscore
function addScore(num: number) {
    score = score + num;
    updateScoreDisplay();
    updateHighscore();
}

function setScore(num: number) {
    score = num;
    updateScoreDisplay();
}

function setLives(num: number) {
    lives = num
    html.text_Lives.textContent = "lives: " + lives.toString();
}

function loseLife(num: number) {
    lives = lives - num
    html.text_Lives.textContent = "lives: " + lives.toString();
}

function getPlaylistHighscore(playlistId: string): number {
    const storedPlaylists = JSON.parse(localStorage.getItem(gamemode) || '[]');
    const playlist = storedPlaylists.find((p: { id: string }) => p.id === playlistId);
    return playlist ? playlist.highscore : 0;
}

function updatePlaylistHighscore(playlistId: string, newHighscore: number) {
    const storedPlaylists = JSON.parse(localStorage.getItem(gamemode) || '[]');
    const playlistIndex = storedPlaylists.findIndex((p: { id: string }) => p.id === playlistId);

    if (playlistIndex !== -1 && newHighscore > storedPlaylists[playlistIndex].highscore) {
        storedPlaylists[playlistIndex].highscore = newHighscore;
        localStorage.setItem(gamemode, JSON.stringify(storedPlaylists));
    }
}

// Set up event listener for button click

// Initialize highscore display
updateHighscoreDisplay(0);

//#endregion

//#region EVENT HANDLERS AND UI INITIALIZATION

// Handle playlist URL input and add playlist to the dropdown without initializing the game
html.button_ProcessUrl.addEventListener('click', async () => {
    const url = html.input_SourceUrl.value;
    // Process Playlist

    if (!url.includes("https://open.spotify.com/playlist/")) {
        alert("Please enter a valid Spotify Playlist URL.");
        return;
    }

    // Extract playlist ID from URL
    playlistId = url.replace("https://open.spotify.com/playlist/", "").split("?")[0];

    // Fetch access token and playlist info
    const playlistData = await fn.fetchSpotify(`playlists/${playlistId}`);

    // Check if playlistData has a valid name
    if (playlistData.name) {
        // Add playlist to the dropdown and local storage
        addPlaylistToDropdown(playlistId, playlistData.name);

        // Clear the input field after adding the playlist
        html.input_SourceUrl.value = '';
    } else {
        console.error('Invalid playlist data received');
        alert("Error getting playlist (Make sure to make your playlist public!)")
    }
}
);

// Function to remove the selected playlist from the dropdown and local storage
html.button_RemoveSource.addEventListener('click', () => {
    const selectedOptionId = html.select_SourceDropdown.value;
    if (!selectedOptionId) {
        alert("Please select an option to remove.");
        return;
    }

    // Remove from the dropdown
    const selectedOption = html.select_SourceDropdown.querySelector(`option[value="${selectedOptionId}"]`);
    if (selectedOption) {
        html.select_SourceDropdown.removeChild(selectedOption);
    }

    // Remove from local storage
    const storedOptions = JSON.parse(localStorage.getItem(gamemode) || '[]');
    const updatedOptions = storedOptions.filter((playlist: { id: string }) => playlist.id !== selectedOptionId);

    // Update local storage
    localStorage.setItem(gamemode, JSON.stringify(updatedOptions));

    // Reset the dropdown to the placeholder option
    html.select_SourceDropdown.value = ''; // This sets it to the first option

    html.button_SubmitGuess.disabled = true;
    html.button_Skip.disabled = true;
    html.input_Guess.disabled = true;
    html.button_NextSong.disabled = true
});

// Function to handle playlist selection change
html.select_SourceDropdown.addEventListener('change', () => {
    if (isGettingSource) return;
    isGettingSource = true
    setScore(0);
    setLives(4);
    const selectedPlaylistId = html.select_SourceDropdown.value;
    if (selectedPlaylistId) {
        switch (gamemode) {
            case 'playlists':
                playlistId = selectedPlaylistId;
                html.text_Title.innerText = "Welcome to Playlistle! The song guessing game??????"
                break;
        }

        const playlistHighscore = getPlaylistHighscore(selectedPlaylistId);
        updateHighscoreDisplay(playlistHighscore);

        // Initialize the game with the selected playlist
        initializeGame();
    }

});

// Check the user's guess when they click the button
html.button_SubmitGuess.addEventListener('click', () => {
    guessHelper(html.input_Guess.value);
});

html.input_Guess.addEventListener('keypress', function (key) {
    if (key.key === 'Enter') {
        guessHelper(html.input_Guess.value);
    }
})

// Handle replay button click
html.button_Replay.addEventListener('click', () => {
    playAndPauseAudio(songLength, startTime);
});

// Skips the current guess
html.button_Skip.addEventListener('click', skipHandler)

// Handle new song button click
html.button_NextSong.addEventListener('click', initializeGame);

html.button_UpdateSource.addEventListener('click', async () => {
    if (isGettingSourceUpdate) {
        return
    }
    isGettingSourceUpdate = true
    const updatedSongs = await fn.getPlaylistSongNames("https://open.spotify.com/playlist/" + playlistId, true)
    fn.databaseUpdate(APPWRITE.DATABASES.MAIN.COLLECTIONS.PLAYLISTS.ID, playlistId, {
        song_names: updatedSongs
    })
    html.text_Status.innerText = 'updated! yipee!';
    setScore(0);
    setLives(4);
    initializeGame()
    isGettingSourceUpdate = false
})

html.button_PlayAgain.addEventListener('click', () => {
    html.text_GameOver.style.display = "none";
    setScore(0);
    setLives(4);
    songCount = 0;
    initializeGame();
})

// Set initial volume from the slider
html.audio_Audio.volume = parseFloat(html.input_VolumeSlider.value);
html.input_VolumeSlider.addEventListener('input', () => {
    html.audio_Audio.volume = parseFloat(html.input_VolumeSlider.value);
});

// Plays song on cover art click
html.image_SongArtwork.addEventListener('click', () => {
    playAndPauseAudio(30, 0);
})

// Copy results to clipboard
html.button_Share.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(`🎧 Playlistle 🎶\n\nFinal score: ${score}\nHighscore: ${getPlaylistHighscore(html.select_SourceDropdown.value)}\nSongs Attempted: ${songCount}\nGamemode: ${gamemode[0].toUpperCase() + gamemode.substring(1).toLocaleLowerCase()} ([${html.select_SourceDropdown.options[html.select_SourceDropdown.selectedIndex].innerText}](https://open.spotify.com/${gamemode.slice(0, -1)}/${html.select_SourceDropdown.value}))\n\n🎵 https://playlistle.github.io/Playlistle/ 🎙️`);
        html.button_Share.innerText = "Copied!";
        console.log("Copied to clipboard!")
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
})

// Game Over Modal Close Button
html.span_CloseGameOver.addEventListener('click', () => {
    html.text_GameOver.style.display = "none";
})

// // Close Game Over Modal if click outside of it
window.addEventListener('click', () => {
    if (event?.target == html.text_GameOver) {
        html.text_GameOver.style.display = "none";
    }
})

// Load playlists from local storage when the page is loaded
window.addEventListener('load', () => {
    gamemode = "playlists";
    html.button_NextSong.disabled = true;
    html.button_SubmitGuess.disabled = true;
    html.button_Skip.disabled = true;
    html.input_Guess.disabled = true;
    html.button_Replay.disabled = true;

    loadPlaylistsFromLocalStorage();
});

//#endregion

//#region HELPER FUNCTIONS

// Handles what happens on guess
export function guessHelper(input: string) {
    const userGuess = input;

    // Input is blank
    if (userGuess == '') {
        html.text_Status.innerText = "hey vro your answer is blank";
        return;
    }

    // Correct guess
    if (userGuess === correctAnswer) {
        html.text_Status.innerText = "yep you got it";
        addScore(30 - (guessCount * 10))
        finishedRound = true
        html.input_Guess.disabled = true;
        html.button_SubmitGuess.disabled = true;
        html.button_Skip.disabled = true;
        revealSongDetails();
    }

    // Incorrect guess
    else {
        html.text_Status.innerText = "nope yikes";
        guessIterator();
    }

}

// Iterates guess count and changes UI elements accordingly
function guessIterator() {
    guesses.push(html.input_Guess.value);
    guessCount++;
    switch (guessCount) {
        case 1:

            songLength = 1;
            _startTime1 = startTime
            startTime = Math.random() * 29;
            html.text_GuessLabel.innerText = "guess 2 (1 second):"
            html.input_Guess.value = '';
            playAndPauseAudio(songLength, startTime);
            break;

        case 2:
            songLength = 3;
            _startTime2 = startTime
            startTime = Math.random() * 29;
            html.text_GuessLabel.innerText = "guess 3 (3 seconds):"
            html.input_Guess.value = '';
            playAndPauseAudio(songLength, startTime);
            break;

        case 3:
            loseLife(1)
            if (lives == 0) {
                showResults();
            }
            finishedRound = true
            html.text_Status.innerText = "damn that sucks";
            html.button_SubmitGuess.disabled = true;
            html.button_Skip.disabled = true;
            html.input_Guess.disabled = true;
            _startTime3 = startTime
            revealSongDetails();
            break;
    }
}

// Handles skip buttons
function skipHandler() {
    html.text_Status.innerText = "nah that's fair I gotchu";
    guessIterator();
}

// Function to reveal the song details
function revealSongDetails() {
    html.text_SongName.style.visibility = 'visible';
    html.image_SongArtwork.style.visibility = 'visible';
}

// Function to load playlists from local storage on page load
function loadPlaylistsFromLocalStorage() {
    // Preserve the first option (assuming it's a placeholder like "Select a playlist")
    const placeholderOption = html.select_SourceDropdown.options[0];

    // Clear the dropdown except the placeholder
    html.select_SourceDropdown.innerHTML = ''; // Clears all options
    html.select_SourceDropdown.add(placeholderOption); // Re-add the placeholder option

    const storedCollections = JSON.parse(localStorage.getItem(gamemode) || '[]');

    switch (gamemode) {
        case 'playlists':
            storedCollections.forEach((playlist: { id: string, name: string }) => {
                addPlaylistToDropdown(playlist.id, playlist.name);
            });
            break;
        case 'artists':
            storedCollections.forEach((artist: { id: string, name: string }) => {
                addPlaylistToDropdown(artist.id, artist.name);
            });
            break;
        case 'albums':
            storedCollections.forEach((album: { id: string, name: string }) => {
                addPlaylistToDropdown(album.id, album.name);
            });
            break;
    }
}

function showResults() {
    html.button_Share.innerText = `share with "the others"!`;
    html.text_GameOver.style.display = "block";
    html.text_Results.innerText = `
        Final score: ${score}\n
        Highscore: ${getPlaylistHighscore(html.select_SourceDropdown.value)}\n
        Songs Attempted: ${songCount}\n
        Gamemode: ${gamemode[0].toUpperCase() + gamemode.substring(1).toLocaleLowerCase()} (${html.select_SourceDropdown.options[html.select_SourceDropdown.selectedIndex].innerText})
        `;
}

//#endregion