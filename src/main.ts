// deno-lint-ignore-file no-explicit-any no-window no-window-prefix
import * as fn from "./functions.ts"

/**
 * !TODO:
 * - ui/ux
 * - add album support
 * - add artist support
 * - add yt and apple music support (maybe)
 * - album art guessing game
 * - album comparison game
 * - score tracking
 * - switch over to people logging in w/ spotify // figure out api keys
 * - add daily rounds stored in a server for each artist (so there can be acloudyskyele, madeonle, etc.)
 * - save playlists even when browser closes
 * - skip guess
 * - add check to see if playlist is public
 * - when it trys again when song has no id, the play again doesn work
 * - excalmations marks are still included
 * - random symobls are stillin cluded
 */

//#region VARIABLE DELCARATIONS

// Global Variables
let accessToken = '';
let playlistId = '';
let artistId = '';
let correctAnswer = '';
let startTime: number;
let startTime1: number;
let startTime2: number;
let startTime3: number;
let songLength: number;
let playlistOrArtist = false; // playlist = false, artist = true

// Get HTML Elements
const titleElement = document.getElementById('title') as HTMLElement;
const loadingElement = document.getElementById('loading') as HTMLElement;
const correctOrNotElement = document.getElementById('correctOrNot') as HTMLElement;
const processUrlButton = document.getElementById('processUrlButton') as HTMLButtonElement;
const processArtistUrlButton = document.getElementById('processUrlButton1') as HTMLButtonElement;
const playlistUrlInput = document.getElementById('playlistUrl') as HTMLInputElement;
const artistUrlInput = document.getElementById('artistUrl') as HTMLInputElement;
const guessInput1 = document.getElementById('guessInput1') as HTMLInputElement;
const guessInput2 = document.getElementById('guessInput2') as HTMLInputElement;
const guessInput3 = document.getElementById('guessInput3') as HTMLInputElement;
const replayButton1 = document.getElementById('replayButton1') as HTMLButtonElement;
const replayButton2 = document.getElementById('replayButton2') as HTMLButtonElement;
const replayButton3 = document.getElementById('replayButton3') as HTMLButtonElement;
const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
const songNameElement = document.getElementById('songName') as HTMLElement;
const songArtistElement = document.getElementById('songArtist') as HTMLElement;
const imageUrlElement = document.getElementById('imageUrl') as HTMLImageElement;
const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
const sourceElement = document.getElementById('previewUrl') as HTMLSourceElement;
const newSongButton = document.getElementById('newSongButton') as HTMLButtonElement;
const playlistDropdown = document.getElementById('playlistDropdown') as HTMLSelectElement;
const removePlaylistButton = document.getElementById('removePlaylistButton') as HTMLButtonElement;
const artistDropdown = document.getElementById('artistDropdown') as HTMLSelectElement;
const removeArtistButton = document.getElementById('removeArtistButton') as HTMLButtonElement;
const artistToggleInput = document.getElementById('playlistOrArtist') as HTMLInputElement;
//#endregion

//#region UTILITY FUNCTIONS

// Function to load playlists from local storage on page load
function loadPlaylistsFromLocalStorage() {
    // Preserve the first option (assuming it's a placeholder like "Select a playlist")
    const placeholderOption = playlistDropdown.options[0];

    // Clear the dropdown except the placeholder
    playlistDropdown.innerHTML = ''; // Clears all options
    playlistDropdown.add(placeholderOption); // Re-add the placeholder option

    const storedPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
    storedPlaylists.forEach((playlist: { id: string, name: string }) => {
        addPlaylistToDropdown(playlist.id, playlist.name, false);
    });

    const artistPlaceholderOption = artistDropdown.options[0];

    // Clear the dropdown except the placeholder
    artistDropdown.innerHTML = ''; // Clears all options
    artistDropdown.add(artistPlaceholderOption); // Re-add the placeholder option

    const storedArtists = JSON.parse(localStorage.getItem('artists') || '[]');
    storedArtists.forEach((artist: { id: string, name: string }) => {
        addPlaylistToDropdown(artist.id, artist.name, true);
    });
}

//#endregion

//#region GAME LOGIC

// Initialize the game by fetching a random song from the playlist
async function initializeGame() {
    let randomSong;
    if (playlistOrArtist) {
        randomSong = await fn.getRandomSongFromArtist("https://open.spotify.com/artist/" + artistId)
    } else {
        randomSong = await fn.getRandomSongFromPlaylist("https://open.spotify.com/playlist/" + playlistId)
    }
    
    // Update UI elements with song details
    correctAnswer = randomSong?.name as string;
    songNameElement.innerText = randomSong?.name as string;
    songArtistElement.innerText = randomSong?.artists as string;
    imageUrlElement.setAttribute("src", randomSong?.image as string);

    // Hide the cover and song name
    songNameElement.style.visibility = 'hidden';
    songArtistElement.style.visibility = 'hidden';
    imageUrlElement.style.visibility = 'hidden';
    correctOrNotElement.innerText = '';
    loadingElement.innerText = '';

    // Guess inputs
    guessInput1.disabled = false
    replayButton1.disabled = false;
    guessInput1.value = '';
    guessInput2.disabled = true;
    replayButton2.disabled = true;
    guessInput2.value = '';
    guessInput3.disabled = true;
    replayButton3.disabled = true;
    guessInput3.value = '';

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
    if ((!randomSong?.viable_source && !playlistOrArtist)) {
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
function addPlaylistToDropdown(playlistId: string, playlistName: string, artist: boolean) {
    // Ensure playlistName is valid (not undefined or empty)
    if (!playlistName) {
        console.error('Invalid playlist name');
        return;
    }

    // Check if the playlist is already in the dropdown
    let existingOption = Array.from(playlistDropdown.options).find(option => option.value === playlistId);
    if (artist) existingOption = Array.from(artistDropdown.options).find(option => option.value === playlistId);
    if (existingOption) {
        return; // Don't add duplicates
    }

    const option = document.createElement('option');
    option.value = playlistId;
    option.text = playlistName;
    if (artist) {
        artistDropdown.add(option);
    } else {
        playlistDropdown.add(option);
    }
    
    let dropdown = "playlists"
    if (artist) dropdown = "artists"

    // Store the playlist in local storage
    const storedPlaylists = JSON.parse(localStorage.getItem(dropdown) || '[]');
    storedPlaylists.push({ id: playlistId, name: playlistName });
    localStorage.setItem(dropdown, JSON.stringify(storedPlaylists));
}

//#endregion

//#region GUESS HANDLERS
// Check the user's 1st guess when they press Enter in the input field
guessInput1.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {

        switch (guessHelper(guessInput1.value)) {
            case GUESS_STATUS.CORRECT:
                correctOrNotElement.innerText = "yep you got it";
                guessInput1.disabled = true;
                guessInput2.disabled = true;
                guessInput3.disabled = true;
                revealSongDetails();
                break;
            case GUESS_STATUS.TYPO:
                correctOrNotElement.innerText = "minor spelling mistake bottom text";
                break;
            case GUESS_STATUS.INCORRECT:
                correctOrNotElement.innerText = "nope yikes";
                guessInput1.disabled = true;
                guessInput2.disabled = false;
                songLength = 1;
                startTime1 = startTime
                startTime = Math.random() * 29;
                replayButton2.disabled = false;
                break;
        }
    }
});

// Check the user's 2nd guess when they press Enter in the input field
guessInput2.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        switch (guessHelper(guessInput2.value)) {
            case GUESS_STATUS.CORRECT:
                correctOrNotElement.innerText = "yep you got it";
                guessInput1.disabled = true;
                guessInput2.disabled = true;
                guessInput3.disabled = true;
                revealSongDetails();
                break;
            case GUESS_STATUS.TYPO:
                correctOrNotElement.innerText = "minor spelling mistake bottom text";
                break;
            case GUESS_STATUS.INCORRECT:
                correctOrNotElement.innerText = "nope yikes";
                guessInput2.disabled = true;
                guessInput3.disabled = false;
                songLength = 3;
                startTime2 = startTime
                startTime = Math.random() * 29;
                replayButton3.disabled = false;
                break;
        }
    }
});

// Check the user's 3rd guess when they press Enter in the input field
guessInput3.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        switch (guessHelper(guessInput3.value)) {
            case GUESS_STATUS.CORRECT:
                correctOrNotElement.innerText = "yep you got it";
                guessInput1.disabled = true;
                guessInput2.disabled = true;
                guessInput3.disabled = true;
                revealSongDetails();
                break;
            case GUESS_STATUS.TYPO:
                correctOrNotElement.innerText = "minor spelling mistake bottom text";
                break;
            case GUESS_STATUS.INCORRECT:
                correctOrNotElement.innerText = "nope yikes";
                startTime3 = startTime
                guessInput3.disabled = true;
                revealSongDetails();
                break;
        }
    }
});
//#endregion

//#region EVENT HANDLERS AND INITIALIZATION

// Handle playlist URL input and add playlist to the dropdown without initializing the game
processUrlButton.addEventListener('click', async () => {
    const url = playlistUrlInput.value;
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
        addPlaylistToDropdown(playlistId, playlistData.name, false);

        // Clear the input field after adding the playlist
        playlistUrlInput.value = '';
    } else {
        console.error('Invalid playlist data received');
    }
});

processArtistUrlButton.addEventListener('click', async () => {
    const url = artistUrlInput.value;
    if (!url.includes("https://open.spotify.com/artist/")) {
        alert("Please enter a valid Spotify Artist URL.");
        return;
    }

    artistId = url.replace("https://open.spotify.com/artist/", "").split("?")[0];

    accessToken = await fn.getAccessToken();
    const artistData = await fn.fetchReference(accessToken, `artists/${artistId}`);

    if (artistData.name) {
        addPlaylistToDropdown(artistId, artistData.name, true);
        artistUrlInput.value = '';
    } else {
        console.error('Invalid artist data received');
    }
});

// Function to remove the selected playlist from the dropdown and local storage
removePlaylistButton.addEventListener('click', () => {
    const selectedPlaylistId = playlistDropdown.value;
    if (!selectedPlaylistId) {
        alert("Please select a playlist to remove.");
        return;
    }

    // Remove from the dropdown
    const selectedOption = playlistDropdown.querySelector(`option[value="${selectedPlaylistId}"]`);
    if (selectedOption) {
        playlistDropdown.removeChild(selectedOption);
    }

    // Remove from local storage
    const storedPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
    const updatedPlaylists = storedPlaylists.filter((playlist: { id: string }) => playlist.id !== selectedPlaylistId);

    // Update local storage
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));

    // Reset the dropdown to the placeholder option
    playlistDropdown.value = ''; // This sets it to the first option, "Select a playlist"
});

removeArtistButton.addEventListener('click', () => {
    const selectedArtistId = artistDropdown.value;
    if (!selectedArtistId) {
        alert("Please select a artist to remove.");
        return;
    }

    const selectedOption = artistDropdown.querySelector(`option[value="${selectedArtistId}"]`);
    if (selectedOption) {
        artistDropdown.removeChild(selectedOption);
    }

    const storedArtists = JSON.parse(localStorage.getItem('artists') || '[]');
    const updatedArtists = storedArtists.filter((artist: { id: string }) => artist.id !== selectedArtistId);

    localStorage.setItem('artists', JSON.stringify(updatedArtists));

    artistDropdown.value = ''; 
});

// Function to handle playlist selection change
playlistDropdown.addEventListener('change', async () => {
    const selectedPlaylistId = playlistDropdown.value;
    if (selectedPlaylistId) {
        playlistId = selectedPlaylistId;

        // Fetch access token if not already available
        if (!accessToken) {
            accessToken = await fn.getAccessToken();
        }

        titleElement.innerText = "Welcome to Playlistle! The song guessing game??????"

        // Initialize the game with the selected playlist
        await initializeGame();
    }
});

artistDropdown.addEventListener('change', async () => {
    const selectedArtistId = artistDropdown.value;
    if (selectedArtistId) {
        artistId = selectedArtistId;

        // Fetch access token if not already available
        if (!accessToken) {
            accessToken = await fn.getAccessToken();
        }
        titleElement.innerText = "Welcome to " + artistDropdown.options[artistDropdown.selectedIndex].innerText + "le! The song guessing game??????"

        // Initialize the game with the selected playlist
        await initializeGame();
    }
});

// Handle replay button click
replayButton1.addEventListener('click', () => {
    playAndPauseAudio(0.5, startTime1);
});
replayButton2.addEventListener('click', () => {
    playAndPauseAudio(1, startTime2);
});
replayButton3.addEventListener('click', () => {
    playAndPauseAudio(3, startTime3);
});

// Handle new song button click
newSongButton.addEventListener('click', initializeGame);

// Set initial volume from the slider
audioElement.volume = parseFloat(volumeSlider.value);
volumeSlider.addEventListener('input', () => {
    audioElement.volume = parseFloat(volumeSlider.value);
});

// Artist Toggle
artistToggleInput.addEventListener('click', () => {
    playlistOrArtist = !playlistOrArtist
})

// Load playlists from local storage when the page is loaded
window.addEventListener('load', () => {
    loadPlaylistsFromLocalStorage();
});
//#endregion

//#region HELPER FUNCTIONS

const enum GUESS_STATUS {
    CORRECT = 0,
    TYPO = 1,
    INCORRECT = 2,
}

//Handles what happens on guess
function guessHelper(input: string) {
    const userGuess = fn.normalizeString(input.trim());
    const normalizedCorrectAnswer = fn.normalizeString(correctAnswer.trim());
    const normalizedAnswerWithoutBrackets = fn.normalizeString(fn.removeBrackets(correctAnswer.trim()));

    //Correct guess
    if (userGuess === normalizedCorrectAnswer || userGuess === normalizedAnswerWithoutBrackets) {
        return 0;
    }
    
    //Minor error (close guess)
    else {
        const distance = fn.levenshteinDistance(userGuess, normalizedAnswerWithoutBrackets);
        if (distance <= 2) {
            return 1
        }
        //Incorrect guess
        else {
            return 2;
        }
    }

}

// Function to reveal the song details
function revealSongDetails() {
    songNameElement.style.visibility = 'visible';
    songArtistElement.style.visibility = 'visible';
    imageUrlElement.style.visibility = 'visible';
}

//#endregion