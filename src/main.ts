// deno-lint-ignore-file no-explicit-any no-window no-window-prefix
import * as fn from "./functions.ts"

//#region VARIABLE DELCARATIONS

// Global Variables
let accessToken = '';
let playlistId = '';
let artistId = '';
let correctAnswer = '';
let guessCount: number;
let startTime: number;
let startTime1: number;
let startTime2: number;
let startTime3: number;
let songLength: number;
let guesses: string[];

// Get HTML Elements
const titleElement = document.getElementById('title') as HTMLElement;
const loadingElement = document.getElementById('loading') as HTMLElement;
const correctOrNotElement = document.getElementById('correctOrNot') as HTMLElement;
const processUrlButton = document.getElementById('processUrlButton') as HTMLButtonElement;
const urlInput = document.getElementById('urlInput') as HTMLInputElement;
const inputLabel = document.getElementById('inputLabel') as HTMLLabelElement;
const guessInput = document.getElementById('guessInput') as HTMLInputElement;
const replayButton = document.getElementById('replayButton') as HTMLButtonElement;
const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
const songInfoElement = document.getElementById('songArtistAndName') as HTMLElement;
const imageUrlElement = document.getElementById('imageUrl') as HTMLImageElement;
const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
const sourceElement = document.getElementById('previewUrl') as HTMLSourceElement;
const newSongButton = document.getElementById('newSongButton') as HTMLButtonElement;
const optionDropdown = document.getElementById('optionDropdown') as HTMLSelectElement;
const removeOptionButton = document.getElementById('removePlaylistButton') as HTMLButtonElement;
const playlistCheckbox = document.getElementById('playlistCheckbox') as HTMLInputElement;
const artistCheckbox = document.getElementById('artistCheckbox') as HTMLInputElement;
const submitButton = document.getElementById('submitButton') as HTMLInputElement;
const skipButton = document.getElementById('skipButton') as HTMLButtonElement;
//#endregion

//#region GAME LOGIC

// Initialize the game by fetching a random song from the playlist
async function initializeGame() {
    let randomSong;
    if (artistCheckbox.checked) {
        randomSong = await fn.getRandomSongFromArtist("https://open.spotify.com/artist/" + artistId)
    } else if (playlistCheckbox.checked) {
        randomSong = await fn.getRandomSongFromPlaylist("https://open.spotify.com/playlist/" + playlistId)
    }
    
    // Update UI elements with song details
    correctAnswer = randomSong?.name as string;
    songInfoElement.innerText = `${randomSong?.artists as string} - ${randomSong?.name as string}`;
    imageUrlElement.setAttribute("src", randomSong?.image as string);

    // Hide the cover and song name
    songInfoElement.style.visibility = 'hidden';
    imageUrlElement.style.visibility = 'hidden';
    correctOrNotElement.innerText = '';
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
    sourceElement.src = randomSong?.preview_url as string;
    audioElement.load();

    startTime = Math.random() * 29; // Random start time for audio
    startTime1 = startTime

    // Play audio and pause after a short duration
    audioElement.addEventListener('loadedmetadata', () => {
        playAndPauseAudio(songLength); // Play for 0.5 seconds by default
    });

    // If after 5 attempts no valid song is found, show an error
    if ((!randomSong?.viable_source && playlistCheckbox.checked)) {
        loadingElement.style.visibility = 'visible';
        loadingElement.innerText = "Too much local songs! Please try a different playlist!";
        imageUrlElement.setAttribute("src", ""); // Clear any image
    }

}

// Function to play audio and pause after a given duration
function playAndPauseAudio(duration: number, overrideStartTime?: number) {
    if (startTime < 30) {
        audioElement.currentTime = startTime;
    }
    if (overrideStartTime) {
        audioElement.currentTime = overrideStartTime;
    }
    audioElement.play();

    setTimeout(() => {
        audioElement.pause();
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
    let existingOption = Array.from(optionDropdown.options).find(option => option.value === playlistId);
    if (existingOption) {
        return; // Don't add duplicates
    }

    const option = document.createElement('option');
    option.value = playlistId;
    option.text = playlistName;
    optionDropdown.add(option);
    
    let dropdown = "playlists";
    if (artistCheckbox.checked) dropdown = "artists";

    // Store the playlist in local storage
    const storedPlaylists = JSON.parse(localStorage.getItem(dropdown) || '[]');
    storedPlaylists.push({ id: playlistId, name: playlistName });
    localStorage.setItem(dropdown, JSON.stringify(storedPlaylists));
}

//#endregion

//#region EVENT HANDLERS AND INITIALIZATION

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
        accessToken = await fn.getAccessToken();
        const playlistData = await fn.fetchReference(accessToken, `playlists/${playlistId}`);
    
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
        accessToken = await fn.getAccessToken();
        const artistData = await fn.fetchReference(accessToken, `artists/${artistId}`);
    
        // Check if artistData has a valid name
        if (artistData.name) {
            addPlaylistToDropdown(artistId, artistData.name);

            // Clear the input field after adding the playlist
            urlInput.value = '';
        } else {
            console.error('Invalid artist data received');
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

    // Check where item is being stored
    let storageType = '';

    if (playlistCheckbox.checked) {
        storageType = 'playlists';
    } else if (artistCheckbox.checked) {
        storageType = 'artists';
    }

    // Remove from local storage
    const storedOptions = JSON.parse(localStorage.getItem(storageType) || '[]');
    let updatedOptions;
    if (playlistCheckbox.checked) {
        updatedOptions = storedOptions.filter((playlist: { id: string }) => playlist.id !== selectedOptionId);
    } else if (artistCheckbox.checked) {
        updatedOptions = storedOptions.filter((artist: { id: string }) => artist.id !== selectedOptionId);
    }
    
    // Update local storage
    localStorage.setItem(storageType, JSON.stringify(updatedOptions));

    // Reset the dropdown to the placeholder option
    optionDropdown.value = ''; // This sets it to the first option
});

// Function to handle playlist selection change
optionDropdown.addEventListener('change', async () => {
    const selectedPlaylistId = optionDropdown.value;
    if (selectedPlaylistId) {
        playlistId = selectedPlaylistId;

        // Fetch access token if not already available
        if (!accessToken) {
            accessToken = await fn.getAccessToken();
        }

        if (playlistCheckbox.checked) {
            titleElement.innerText = "Welcome to Playlistle! The song guessing game??????"
        } else if (artistCheckbox.checked) {
            titleElement.innerText = "Welcome to " + optionDropdown.options[optionDropdown.selectedIndex].innerText + "le! The song guessing game??????"
        }

        // Initialize the game with the selected playlist
        await initializeGame();
    }
});

// Check the user's guess when they press Enter in the input field
guessInput.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        guessHelper(guessInput.value);
    }
});

// Check the user's guess when they click the button
submitButton.addEventListener('click', () => {
    guessHelper(guessInput.value);
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

    playlistCheckbox.disabled = true;

    urlInput.placeholder="https://open.spotify.com/playlist/...";

    loadPlaylistsFromLocalStorage();
})

// Artist Toggle
artistCheckbox.addEventListener('click', () => {
    playlistCheckbox.disabled = false;
    playlistCheckbox.checked = false;

    artistCheckbox.disabled = true;

    urlInput.placeholder="https://open.spotify.com/artist/...";

    loadPlaylistsFromLocalStorage();
})

// Load playlists from local storage when the page is loaded
window.addEventListener('load', () => {
    loadPlaylistsFromLocalStorage();
});
//#endregion

//#region HELPER FUNCTIONS

// Handles what happens on guess
function guessHelper(input: string) {
    const userGuess = fn.normalizeString(input.trim());
    const normalizedCorrectAnswer = fn.normalizeString(correctAnswer.trim());
    const normalizedAnswerWithoutBrackets = fn.normalizeString(fn.removeBrackets(correctAnswer.trim()));

    // Input is blank
    if (userGuess == '') {
        correctOrNotElement.innerText = "hey vro your answer is blank";
        return;
    }

    // Correct guess
    if (userGuess === normalizedCorrectAnswer || userGuess === normalizedAnswerWithoutBrackets) {
        correctOrNotElement.innerText = "yep you got it";
        guessInput.disabled = true;
        submitButton.disabled = true;
        skipButton.disabled = true;
        revealSongDetails();
    }
    
    // Minor error (close guess)
    else {
        const distance = fn.levenshteinDistance(userGuess, normalizedAnswerWithoutBrackets);
        if (distance <= 2) {
            correctOrNotElement.innerText = "minor spelling mistake bottom text";
            return;
        }
        // Incorrect guess
        else {
            correctOrNotElement.innerText = "nope yikes";
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
            correctOrNotElement.innerText = "damn that sucks";
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
    correctOrNotElement.innerText = "nah that's fair I gotchu";
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

    if (playlistCheckbox.checked) {
        const storedPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
        storedPlaylists.forEach((playlist: { id: string, name: string }) => {
            addPlaylistToDropdown(playlist.id, playlist.name);
        });
    } else if (artistCheckbox.checked) {
        const storedArtists = JSON.parse(localStorage.getItem('artists') || '[]');
        storedArtists.forEach((artist: { id: string, name: string }) => {
            addPlaylistToDropdown(artist.id, artist.name);
        });
    }
}

//#endregion