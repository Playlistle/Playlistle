/**
 * !TODO:
 * - add different time options (0.5, 1, 5)
 * - ui/ux
 */

// Load environment variables for Spotify API keys
const clientId = import.meta.env.VITE_API_KEY;
const clientSecret = import.meta.env.VITE_API_SECRET;

// Global Variables
let accessToken: string = '';
let playlistId: string = '';
let playlistSongs: any;
let correctAnswer: string = '';
let startTime: number;
let startTime1: number;
let startTime2: number;
let startTime3: number;
let songLength: number;

// Get HTML Elements
const loadingElement = document.getElementById('loading') as HTMLElement;
const correctOrNotElement = document.getElementById('correctOrNot') as HTMLElement;
const processUrlButton = document.getElementById('processUrlButton') as HTMLButtonElement;
const playlistUrlInput = document.getElementById('playlistUrl') as HTMLInputElement;
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

// Function to add playlist to the dropdown and store it in local storage
function addPlaylistToDropdown(playlistId: string, playlistName: string) {
    // Ensure playlistName is valid (not undefined or empty)
    if (!playlistName) {
        console.error('Invalid playlist name');
        return;
    }

    // Check if the playlist is already in the dropdown
    const existingOption = Array.from(playlistDropdown.options).find(option => option.value === playlistId);
    if (existingOption) {
        return; // Don't add duplicates
    }

    const option = document.createElement('option');
    option.value = playlistId;
    option.text = playlistName;
    playlistDropdown.add(option);

    // Store the playlist in local storage
    const storedPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
    storedPlaylists.push({ id: playlistId, name: playlistName });
    localStorage.setItem('playlists', JSON.stringify(storedPlaylists));
}

// Function to load playlists from local storage on page load
function loadPlaylistsFromLocalStorage() {
    // Preserve the first option (assuming it's a placeholder like "Select a playlist")
    const placeholderOption = playlistDropdown.options[0];
    
    // Clear the dropdown except the placeholder
    playlistDropdown.innerHTML = ''; // Clears all options
    playlistDropdown.add(placeholderOption); // Re-add the placeholder option

    const storedPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]');
    storedPlaylists.forEach((playlist: { id: string, name: string }) => {
        addPlaylistToDropdown(playlist.id, playlist.name);
    });
}

// Function to handle playlist selection change
playlistDropdown.addEventListener('change', async () => {
    const selectedPlaylistId = playlistDropdown.value;
    if (selectedPlaylistId) {
        playlistId = selectedPlaylistId;

        // Fetch access token if not already available
        if (!accessToken) {
            accessToken = await getAccessToken();
        }

        // Fetch songs from the selected playlist
        playlistSongs = await fetchReference(accessToken, `playlists/${playlistId}/tracks`);

        // Initialize the game with the selected playlist
        await initializeGame();
    }
});

//! UTILITY FUNCTIONS

// Function to normalize a string by removing punctuation, spaces, and making it lowercase
function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^\w\s]|_/g, "")
        .replace(/\s+/g, " ");
}

// Function to remove brackets and parentheses from the string
function removeBrackets(str: string): string {
    return str
        .replace(/ *\[[^\]]*] */g, '')
        .replace(/ *\([^\)]*\) */g, '');
}

// Function to calculate the Levenshtein distance (for detecting close guesses)
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

//! SPOTIFY API FUNCTIONS

// Fetch Spotify access token using client credentials
async function getAccessToken(): Promise<string> {
    const url = 'https://accounts.spotify.com/api/token';
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials',
    });
    if (response.ok) {
        const jsonResponse = await response.json();
        return jsonResponse.access_token;
    } else {
        console.error(response.statusText);
        throw new Error(`Request failed! Status code: ${response.status} ${response.statusText}`);
    }
}

// Fetch playlist songs from Spotify API
async function fetchReference(token: string, reference: string): Promise<any> {
    const result = await fetch("https://api.spotify.com/v1/" + reference, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}

//! GAME LOGIC

// Initialize the game by fetching a random song from the playlist
async function initializeGame() {
    let validSongFound = false;
    let attempts = 0;

    while (!validSongFound && attempts < 5) {
        attempts++;

        // Fetch a random song from the playlist
        const morePlaylistSongs = await fetchReference(accessToken, `playlists/${playlistId}/tracks?limit=1&offset=${Math.floor(Math.random() * playlistSongs.total)}`);
        const randomSong = morePlaylistSongs.items[0].track;

        // Check if the preview URL is valid
        if (randomSong.preview_url) {
            validSongFound = true;

            // Update UI elements with song details
            correctAnswer = randomSong.name;
            songNameElement.innerText = randomSong.name;
            songArtistElement.innerText = randomSong.artists[0].name;
            imageUrlElement.setAttribute("src", randomSong.album.images[0].url);

            // Hide the cover and song name
            songNameElement.style.visibility = 'hidden';
            songArtistElement.style.visibility = 'hidden';
            imageUrlElement.style.visibility = 'hidden';
            correctOrNotElement.innerText = '';

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
            sourceElement.src = randomSong.preview_url;
            audioElement.load();

            startTime = Math.random() * 29; // Random start time for audio
            startTime1 = startTime

            // Play audio and pause after a short duration
            audioElement.addEventListener('loadedmetadata', () => {
                playAndPauseAudio(songLength); // Play for 0.5 seconds by default
            });

        } else {
            console.log(`Attempt ${attempts}: Song has no preview URL, trying another...`);
        }

        // If after 5 attempts no valid song is found, show an error
        if (attempts === 5 && !validSongFound) {
            loadingElement.style.visibility = 'visible';
            loadingElement.innerText = "Too much local songs! Please try a different playlist!";
            imageUrlElement.setAttribute("src", ""); // Clear any image
        }
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

// Check the user's 1st guess when they press Enter in the input field
guessInput1.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        const userGuess = normalizeString(guessInput1.value.trim());
        const normalizedCorrectAnswer = normalizeString(correctAnswer.trim());
        const normalizedAnswerWithoutBrackets = normalizeString(removeBrackets(correctAnswer.trim()));

        // Function to reveal the song details
        function revealSongDetails() {
            songNameElement.style.visibility = 'visible';
            songArtistElement.style.visibility = 'visible';
            imageUrlElement.style.visibility = 'visible';
        }

        // Correct guess
        if (userGuess === normalizedCorrectAnswer || userGuess === normalizedAnswerWithoutBrackets) {
            correctOrNotElement.innerText = "yep you got it";
            guessInput1.disabled = true;
            guessInput2.disabled = true;
            guessInput3.disabled = true;
            revealSongDetails();
        } 
        // Minor error (close guess)
        else {
            const distance = levenshteinDistance(userGuess, normalizedAnswerWithoutBrackets);
            if (distance <= 2) {
                correctOrNotElement.innerText = "minor spelling mistake bottom text";
            } 
            // Incorrect guess
            else {
                correctOrNotElement.innerText = "nope yikes";
                guessInput1.disabled = true;
                guessInput2.disabled = false;
                songLength = 1;
                startTime1 = startTime
                startTime = Math.random() * 29;
                replayButton2.disabled = false;
            }
        }
    }
});

// Check the user's 2nd guess when they press Enter in the input field
guessInput2.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        const userGuess = normalizeString(guessInput2.value.trim());
        const normalizedCorrectAnswer = normalizeString(correctAnswer.trim());
        const normalizedAnswerWithoutBrackets = normalizeString(removeBrackets(correctAnswer.trim()));

        // Function to reveal the song details
        function revealSongDetails() {
            songNameElement.style.visibility = 'visible';
            songArtistElement.style.visibility = 'visible';
            imageUrlElement.style.visibility = 'visible';
        }

        // Correct guess
        if (userGuess === normalizedCorrectAnswer || userGuess === normalizedAnswerWithoutBrackets) {
            correctOrNotElement.innerText = "yep you got it";
            revealSongDetails();
            guessInput1.disabled = true;
            guessInput2.disabled = true;
            guessInput3.disabled = true;
        } 
        // Minor error (close guess)
        else {
            const distance = levenshteinDistance(userGuess, normalizedAnswerWithoutBrackets);
            if (distance <= 2) {
                correctOrNotElement.innerText = "minor spelling mistake bottom text";
            } 
            // Incorrect guess
            else {
                correctOrNotElement.innerText = "nope yikes";
                guessInput2.disabled = true;
                guessInput3.disabled = false;
                songLength = 3;
                startTime2 = startTime
                startTime = Math.random() * 29;
                replayButton3.disabled = false;
            }
        }
    }
});

// Check the user's 3rd guess when they press Enter in the input field
guessInput3.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        const userGuess = normalizeString(guessInput3.value.trim());
        const normalizedCorrectAnswer = normalizeString(correctAnswer.trim());
        const normalizedAnswerWithoutBrackets = normalizeString(removeBrackets(correctAnswer.trim()));

        // Function to reveal the song details
        function revealSongDetails() {
            songNameElement.style.visibility = 'visible';
            songArtistElement.style.visibility = 'visible';
            imageUrlElement.style.visibility = 'visible';
        }

        // Correct guess
        if (userGuess === normalizedCorrectAnswer || userGuess === normalizedAnswerWithoutBrackets) {
            correctOrNotElement.innerText = "yep you got it";
            guessInput1.disabled = true;
            guessInput2.disabled = true;
            guessInput3.disabled = true;
            revealSongDetails();
        } 
        // Minor error (close guess)
        else {
            const distance = levenshteinDistance(userGuess, normalizedAnswerWithoutBrackets);
            if (distance <= 2) {
                correctOrNotElement.innerText = "minor spelling mistake bottom text";
            } 
            // Incorrect guess
            else {
                correctOrNotElement.innerText = "nope yikes";
                startTime3 = startTime
                guessInput3.disabled = true;
                revealSongDetails();
            }
        }
    }
});

//! EVENT HANDLERS AND INITIALIZATION

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
    accessToken = await getAccessToken();
    const playlistData = await fetchReference(accessToken, `playlists/${playlistId}`);

    // Check if playlistData has a valid name
    if (playlistData.name) {
        // Add playlist to the dropdown and local storage
        addPlaylistToDropdown(playlistId, playlistData.name);

        // Clear the input field after adding the playlist
        playlistUrlInput.value = '';
    } else {
        console.error('Invalid playlist data received');
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

// Load playlists from local storage when the page is loaded
window.addEventListener('load', () => {
    loadPlaylistsFromLocalStorage();
});