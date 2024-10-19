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

// Get HTML Elements
const loadingElement = document.getElementById('loading') as HTMLElement;
const correctOrNotElement = document.getElementById('correctOrNot') as HTMLElement;
const processUrlButton = document.getElementById('processUrlButton') as HTMLButtonElement;
const playlistUrlInput = document.getElementById('playlistUrl') as HTMLInputElement;
const guessInput = document.getElementById('guessInput') as HTMLInputElement;
const replayButton = document.getElementById('replayButton') as HTMLButtonElement;
const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
const songNameElement = document.getElementById('songName') as HTMLElement;
const songArtistElement = document.getElementById('songArtist') as HTMLElement;
const imageUrlElement = document.getElementById('imageUrl') as HTMLImageElement;
const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
const sourceElement = document.getElementById('previewUrl') as HTMLSourceElement;
const newSongButton = document.getElementById('newSongButton') as HTMLButtonElement;

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

            // Set up audio preview
            sourceElement.src = randomSong.preview_url;
            audioElement.load();

            startTime = Math.floor(Math.random() * 29); // Random start time for audio

            // Play audio and pause after a short duration
            audioElement.addEventListener('loadedmetadata', () => {
                playAndPauseAudio(0.5); // Play for 0.5 seconds by default
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
function playAndPauseAudio(duration: number) {
    if (startTime < 30) {
        audioElement.currentTime = startTime;
    }
    audioElement.play();

    setTimeout(() => {
        audioElement.pause();
    }, duration * 1000);
}

// Check the user's guess when they press Enter in the input field
guessInput.addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
        const userGuess = normalizeString(guessInput.value.trim());
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
            guessInput.value = '';
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
                revealSongDetails();
                guessInput.value = '';
            }
        }
    }
});

//! EVENT HANDLERS AND INITIALIZATION

// Handle playlist URL input and start game
processUrlButton.addEventListener('click', async () => {
    const url = playlistUrlInput.value;
    if (!url.includes("https://open.spotify.com/playlist/")) {
        alert("Please enter a valid Spotify Playlist URL.");
        return;
    }

    // Hide text
    correctOrNotElement.innerText = "";

    // Extract playlist ID from URL
    playlistId = url.replace("https://open.spotify.com/playlist/", "").split("?")[0];
    
    // Fetch access token and playlist songs
    accessToken = await getAccessToken();
    playlistSongs = await fetchReference(accessToken, `playlists/${playlistId}/tracks`);

    loadingElement.style.visibility = 'hidden';
    loadingElement.innerText = '';
    await initializeGame();
});

// Handle replay button click
replayButton.addEventListener('click', () => {
    playAndPauseAudio(0.5);
});

// Handle new song button click
newSongButton.addEventListener('click', initializeGame);

// Set initial volume from the slider
audioElement.volume = parseFloat(volumeSlider.value);
volumeSlider.addEventListener('input', () => {
    audioElement.volume = parseFloat(volumeSlider.value);
});
