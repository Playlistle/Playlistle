// deno-lint-ignore-file no-window no-window-prefix
import * as fn from "./functions.ts"

//#region VARIABLE DELCARATIONS

// Global Variables
let playlistId = '';
let artistId = '';
let albumId = '';
let correctAnswer = '';
let gamemode = 'playlists';
let lastSong: object;
let guessCount: number;
let startTime: number;
let startTime1: number;
let startTime2: number;
let startTime3: number;
let songLength: number;
let guesses: string[];
let score = 0;
let lives = 3;
let finishedRound = false;
let isPlaying = false;
let isGettingSource = false;

// Get HTML Elements
const titleElement = document.getElementById('title') as HTMLElement;
const loadingElement = document.getElementById('loading') as HTMLElement;
const feedbackElement = document.getElementById('feedback') as HTMLElement;
const processUrlButton = document.getElementById('process-btn') as HTMLButtonElement;
const urlInput = document.getElementById('url-input') as HTMLInputElement;
const inputLabel = document.getElementById('input-label') as HTMLLabelElement;
const guessInput = document.getElementById('guess-input') as HTMLInputElement;
const replayButton = document.getElementById('replay-btn') as HTMLButtonElement;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const songInfoElement = document.getElementById('song-title') as HTMLElement;
const imageUrlElement = document.getElementById('image-url') as HTMLImageElement;
const audioElement = document.getElementById('audio-element') as HTMLAudioElement;
const sourceElement = document.getElementById('preview-url') as HTMLSourceElement;
const newSongButton = document.getElementById('newSong-btn') as HTMLButtonElement;
const optionDropdown = document.getElementById('option-drpdn') as HTMLSelectElement;
const removeOptionButton = document.getElementById('remove-btn') as HTMLButtonElement;
const playlistCheckbox = document.getElementById('playlist-cbx') as HTMLInputElement;
const artistCheckbox = document.getElementById('artist-cbx') as HTMLInputElement;
const albumCheckbox = document.getElementById('album-cbx') as HTMLInputElement;
const submitButton = document.getElementById('submit-btn') as HTMLInputElement;
const skipButton = document.getElementById('skip-btn') as HTMLButtonElement;
const scoreElement = document.getElementById("score") as HTMLElement;
const highscoreElement = document.getElementById("highscore") as HTMLElement;
const livesElement = document.getElementById("lives") as HTMLElement;
const gameoverElement = document.getElementById("game-over") as HTMLElement;
const testingButton = document.getElementById("testing-btn") as HTMLButtonElement;
const closeGameoverButton = document.getElementsByClassName("close")[0] as HTMLElement;
const resultsTextElement = document.getElementById("results") as HTMLElement;
const shareButton = document.getElementById("copy-btn") as HTMLButtonElement;

//#endregion

//#region GAME LOGIC

// Initialize the game by fetching a random song from the playlist
async function initializeGame() {
    if (!finishedRound) {
        loseLife(1)
    }

    if (lives <= 0) {
        setLives(3)
        setScore(0)
    }

    finishedRound = false

    let randomSong;

    do {
        switch (gamemode) {
            case 'playlists':
                randomSong = await fn.randomSongFromPlaylist("https://open.spotify.com/playlist/" + playlistId);
                break;
            case 'artists':
                randomSong = await fn.randomSongFromArtist("https://open.spotify.com/artist/" + artistId);
                break;
            case 'albums':
                randomSong = await fn.randomSongFromAlbum("https://open.spotify.com/album/" + albumId);
                break;
        }
    } while (lastSong === randomSong)
    
    lastSong = randomSong;

    // Update UI elements with song details
    correctAnswer = randomSong?.name as string;
    songInfoElement.innerText = `${randomSong?.artists as string} - ${randomSong?.name as string}`;
    songInfoElement.setAttribute("href", randomSong?.main_url as string);
    imageUrlElement.setAttribute("src", randomSong?.image as string);

    // Hide the cover and song name
    songInfoElement.style.visibility = 'hidden';
    imageUrlElement.style.visibility = 'hidden';
    feedbackElement.innerText = '';
    loadingElement.innerText = '';

    // Guess inputs
    guessInput.disabled = false
    submitButton.disabled = false;
    skipButton.disabled = false;
    guessInput.value = '';
    inputLabel.innerText = "guess 1 (0.5 seconds):";

    guessCount = 0;
    guesses = [];
    songLength = 0.5;

    // Set up audio preview
    sourceElement.src = await randomSong?.preview_url as string;
    audioElement.load();

    startTime = Math.random() * 29; // Random start time for audio
    startTime1 = startTime

    // Play audio and pause after a short duration
    audioElement.addEventListener('loadedmetadata', () => {
        playAndPauseAudio(songLength, startTime); // Play for 0.5 seconds by default
    });

    // If after 5 attempts no valid song is found, show an error
    if (((randomSong == undefined) && playlistCheckbox.checked)) {
        loadingElement.style.visibility = 'visible';
        loadingElement.innerText = "Too much local songs! Please try a different playlist!";
        imageUrlElement.setAttribute("src", ""); // Clear any image
    }

    isGettingSource = false

    fn.setupAutocomplete()
}

// Function to play audio and pause after a given duration
function playAndPauseAudio(duration: number, overrideStartTime?: number) {
    if (isPlaying) {
        audioElement.pause();
        isPlaying = false;
        return;
    }  // Pause song if already playing
    isPlaying = true;
    if (startTime < 30) {
        audioElement.currentTime = startTime;
    }
    if (overrideStartTime) {
        audioElement.currentTime = overrideStartTime;
    }
    audioElement.play();

    setTimeout(() => {
        audioElement.pause();
        isPlaying = false;
    }, duration * 1000);
}

// Function to add playlist to the dropdown and store it in local storage
function addPlaylistToDropdown(playlistId: string, playlistName: string) {
    // Ensure playlistName is valid (not undefined or empty)
    if (!playlistName) {
        console.error('Invalid playlist name');
        return;
    }

    // Check if the playlist is already in the dropdown
    const existingOption = Array.from(optionDropdown.options).find(option => option.value === playlistId);
    if (existingOption) {
        return; // Don't add duplicates
    }

    const option = document.createElement('option');
    option.value = playlistId;
    option.text = playlistName;
    optionDropdown.add(option);

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
    scoreElement.textContent = `scoreee: ${score}`;
}

// Function to update the displayed highscore
function updateHighscoreDisplay(highscore: number) {
    highscoreElement.textContent = `best: ${highscore}`;
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
    livesElement.textContent = "lives: " + lives.toString();
}

function loseLife(num: number) {
    lives = lives - num
    livesElement.textContent = "lives: " + lives.toString();
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
processUrlButton.addEventListener('click', async () => {
    const url = urlInput.value;
    if (playlistCheckbox.checked) {
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
            urlInput.value = '';
        } else {
            console.error('Invalid playlist data received');
        }
    } else if (artistCheckbox.checked) {
        // Process Artist

        if (!url.includes("https://open.spotify.com/artist/")) {
            alert("Please enter a valid Spotify Artist URL.");
            return;
        }

        // Extract artist ID from URL
        artistId = url.replace("https://open.spotify.com/artist/", "").split("?")[0];

        // Fetch access token and artist info
        const artistData = await fn.fetchSpotify(`artists/${artistId}`);

        // Check if artistData has a valid name
        if (artistData.name) {
            addPlaylistToDropdown(artistId, artistData.name);

            // Clear the input field after adding the playlist
            urlInput.value = '';
        } else {
            console.error('Invalid artist data received');
        }
    } else if (albumCheckbox.checked) {
        // Process Album
        if (!url.includes("https://open.spotify.com/album/")) {
            alert("Please enter a valid Spotify Album URL.");
            return;
        }

        // Extract artist ID from URL
        albumId = url.replace("https://open.spotify.com/album/", "").split("?")[0];

        // Fetch access token and artist info
        const albumData = await fn.fetchSpotify(`albums/${albumId}`);

        // Check if artistData has a valid name
        if (albumData.name) {
            addPlaylistToDropdown(albumId, albumData.name);

            // Clear the input field after adding the playlist
            urlInput.value = '';
        } else {
            console.error('Invalid album data received');
        }
    }

});

// Function to remove the selected playlist from the dropdown and local storage
removeOptionButton.addEventListener('click', () => {
    const selectedOptionId = optionDropdown.value;
    if (!selectedOptionId) {
        alert("Please select an option to remove.");
        return;
    }

    // Remove from the dropdown
    const selectedOption = optionDropdown.querySelector(`option[value="${selectedOptionId}"]`);
    if (selectedOption) {
        optionDropdown.removeChild(selectedOption);
    }

    // Remove from local storage
    const storedOptions = JSON.parse(localStorage.getItem(gamemode) || '[]');
    let updatedOptions;
    if (playlistCheckbox.checked) {
        updatedOptions = storedOptions.filter((playlist: { id: string }) => playlist.id !== selectedOptionId);
    } else if (artistCheckbox.checked) {
        updatedOptions = storedOptions.filter((artist: { id: string }) => artist.id !== selectedOptionId);
    } else if (albumCheckbox.checked) {
        updatedOptions = storedOptions.filter((album: { id: string }) => album.id !== selectedOptionId);
    }

    // Update local storage
    localStorage.setItem(gamemode, JSON.stringify(updatedOptions));

    // Reset the dropdown to the placeholder option
    optionDropdown.value = ''; // This sets it to the first option
});

// Function to handle playlist selection change
optionDropdown.addEventListener('change', () => {
    if (isGettingSource) return;
    isGettingSource = true
    setScore(0);
    setLives(4);
    const selectedPlaylistId = optionDropdown.value;
    if (selectedPlaylistId) {
        switch (gamemode) {
            case 'playlists': 
                playlistId = selectedPlaylistId;
                titleElement.innerText = "Welcome to Playlistle! The song guessing game??????"
                break;
            case 'artists':
                artistId = selectedPlaylistId;
                titleElement.innerText = "Welcome to " + optionDropdown.options[optionDropdown.selectedIndex].innerText + "le! The song guessing game??????"
                break;
            case 'albums':
                albumId = selectedPlaylistId;
                titleElement.innerText = "Welcome to " + optionDropdown.options[optionDropdown.selectedIndex].innerText + "le! The song guessing game??????"
                break;
        }

        const playlistHighscore = getPlaylistHighscore(selectedPlaylistId);
        updateHighscoreDisplay(playlistHighscore);

        // Initialize the game with the selected playlist
        initializeGame();
    }

});

// Check the user's guess when they click the button
submitButton.addEventListener('click', () => {
    guessHelper(guessInput.value);
});

// Check user's guess on 'enter' press
guessInput.addEventListener('keydown', function (e) {
    if (e.key === "Enter") {
        guessHelper(guessInput.value);
    }
});

// Handle replay button click
replayButton.addEventListener('click', () => {
    playAndPauseAudio(songLength, startTime);
});

// Skips the current guess
skipButton.addEventListener('click', skipHandler)

// Handle new song button click
newSongButton.addEventListener('click', initializeGame);

// Set initial volume from the slider
audioElement.volume = parseFloat(volumeSlider.value);
volumeSlider.addEventListener('input', () => {
    audioElement.volume = parseFloat(volumeSlider.value);
});

// Playlist Toggle
playlistCheckbox.addEventListener('click', () => {
    artistCheckbox.disabled = false;
    artistCheckbox.checked = false;
    albumCheckbox.disabled = false;
    albumCheckbox.checked = false;

    gamemode = "playlists";

    playlistCheckbox.disabled = true;

    urlInput.placeholder = "https://open.spotify.com/playlist/...";

    loadPlaylistsFromLocalStorage();
})

// Artist Toggle
artistCheckbox.addEventListener('click', () => {
    playlistCheckbox.disabled = false;
    playlistCheckbox.checked = false;
    albumCheckbox.disabled = false;
    albumCheckbox.checked = false;

    gamemode = "artists";

    artistCheckbox.disabled = true;

    urlInput.placeholder = "https://open.spotify.com/artist/...";

    loadPlaylistsFromLocalStorage();
})

// Album Toggle
albumCheckbox.addEventListener('click', () => {
    playlistCheckbox.disabled = false;
    playlistCheckbox.checked = false;
    artistCheckbox.disabled = false;
    artistCheckbox.checked = false;

    gamemode = "albums";

    albumCheckbox.disabled = true;

    urlInput.placeholder = "https://open.spotify.com/album/...";

    loadPlaylistsFromLocalStorage();
})

// Plays song on cover art click
imageUrlElement.addEventListener('click', () => {
    playAndPauseAudio(30);
})

// Copy results to clipboard
shareButton.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(`🎧 Playlistle 🎶\n\nFinal score: ${score}\nHighscore: ${getPlaylistHighscore(optionDropdown.value)}\nGamemode: ${gamemode[0].toUpperCase() + gamemode.substring(1).toLocaleLowerCase()} ([${optionDropdown.options[optionDropdown.selectedIndex].innerText}](https://open.spotify.com/${gamemode.slice(0,-1)}/${optionDropdown.value}))\n\n🎵 [Placeholder for link] 🎙️`);
        shareButton.innerText = "Copied!";
        console.log("Copied to clipboard!")
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
})

// Game Over Modal Close Button
closeGameoverButton.addEventListener('click', () => {
    gameoverElement.style.display = "none";
})

// // Close Game Over Modal if click outside of it
window.addEventListener('click', () => {
    if (event?.target == gameoverElement) {
        gameoverElement.style.display = "none";
    }
})

// Load playlists from local storage when the page is loaded
window.addEventListener('load', () => {
    playlistCheckbox.checked = true;
    playlistCheckbox.disabled = true;
    artistCheckbox.checked = false;
    artistCheckbox.disabled = false;
    albumCheckbox.checked = false;
    albumCheckbox.disabled = false;

    gamemode = "playlists";

    loadPlaylistsFromLocalStorage();
});

//#endregion

//#region HELPER FUNCTIONS

// Handles what happens on guess
export function guessHelper(input: string) {
    const userGuess = fn.normalizeString(input.trim());
    const normalizedCorrectAnswer = fn.normalizeString(correctAnswer.trim());
    const normalizedAnswerWithoutBrackets = fn.normalizeString(fn.removeBrackets(correctAnswer.trim()));

    // Input is blank
    if (userGuess == '') {
        feedbackElement.innerText = "hey vro your answer is blank";
        return;
    }

    // Correct guess
    if (userGuess === normalizedCorrectAnswer || userGuess === normalizedAnswerWithoutBrackets) {
        feedbackElement.innerText = "yep you got it";
        addScore(30 - (guessCount * 10))
        finishedRound = true
        guessInput.disabled = true;
        submitButton.disabled = true;
        skipButton.disabled = true;
        revealSongDetails();
    }

    // Minor error (close guess)
    else {
        const distance = fn.levenshteinDistance(userGuess, normalizedAnswerWithoutBrackets);
        if (distance <= 2) {
            feedbackElement.innerText = "minor spelling mistake bottom text";
            return;
        }
        // Incorrect guess
        else {
            feedbackElement.innerText = "nope yikes";
            guessIterator();
        }
    }

}

// Iterates guess count and changes UI elements accordingly
function guessIterator() {
    guesses.push(guessInput.value);
    guessCount++;
    switch (guessCount) {
        case 1:

            songLength = 1;
            startTime1 = startTime
            startTime = Math.random() * 29;
            inputLabel.innerText = "guess 2 (1 second):"
            guessInput.value = '';
            playAndPauseAudio(songLength, startTime);
            break;

        case 2:
            songLength = 3;
            startTime2 = startTime
            startTime = Math.random() * 29;
            inputLabel.innerText = "guess 3 (3 seconds):"
            guessInput.value = '';
            playAndPauseAudio(songLength, startTime);
            break;

        case 3:
            loseLife(1)
            if (lives == 0) {
                showResults();
            }
            finishedRound = true
            feedbackElement.innerText = "damn that sucks";
            submitButton.disabled = true;
            skipButton.disabled = true;
            guessInput.disabled = true;
            startTime3 = startTime
            revealSongDetails();
            break;
    }
}

// Handles skip buttons
function skipHandler() {
    feedbackElement.innerText = "nah that's fair I gotchu";
    guessIterator();
}

// Function to reveal the song details
function revealSongDetails() {
    songInfoElement.style.visibility = 'visible';
    imageUrlElement.style.visibility = 'visible';
}

// Function to load playlists from local storage on page load
function loadPlaylistsFromLocalStorage() {
    // Preserve the first option (assuming it's a placeholder like "Select a playlist")
    const placeholderOption = optionDropdown.options[0];

    // Clear the dropdown except the placeholder
    optionDropdown.innerHTML = ''; // Clears all options
    optionDropdown.add(placeholderOption); // Re-add the placeholder option

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

function showResults () {
    gameoverElement.style.display = "block";
    resultsTextElement.innerText = `Final score: ${score}\nHighscore: ${getPlaylistHighscore(optionDropdown.value)}\nGamemode: ${gamemode[0].toUpperCase() + gamemode.substring(1).toLocaleLowerCase()} (${optionDropdown.options[optionDropdown.selectedIndex].innerText})`;
}

//#endregion