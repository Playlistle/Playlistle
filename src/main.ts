/**
 * !TODO:
 * - remove playlistId intial playlist hnfvjearkiusl
 * - add the typing in feature
 * - hide api keys somehow
 * - add different time options (0.5, 1, 5)
 * - ui/ux
 */

// to run: npm run dev // and then go to http://localhost:5173/

const clientId = import.meta.env.VITE_API_KEY;
const clientSecret = import.meta.env.VITE_API_SECRET;

// artist: 5OeSHuvHTS9qUgAUTt3GIR
// track: 13X0MbPS0WOenZsShfvI5g
// playlist: 76k53inmGadUWB9HOH0GEl
let playlistId = "76k53inmGadUWB9HOH0GEl";
let intialized = false

const loadingElement = document.getElementById('loading') as HTMLElement;

const processUrlButton = document.getElementById('processUrlButton') as HTMLButtonElement;
const playlistUrlInput = document.getElementById('playlistUrl') as HTMLInputElement;


processUrlButton.addEventListener('click', () => {
    const url = playlistUrlInput.value;

    // Check if the URL contains the valid playlist prefix
    if (!url.includes("https://open.spotify.com/playlist/")) {
        console.error("Invalid Spotify Playlist URL.");
        alert("Please enter a valid Spotify Playlist URL.");
        return; // Exit the function early
    }

    if (!intialized) intializeGame();
    intialized = true
    loadingElement.style.visibility = 'hidden'
    loadingElement.innerText = ""

    // Remove the "https://open.spotify.com/playlist/" part and everything after the "?"
    const extractedPlaylistId = url.replace("https://open.spotify.com/playlist/", "").split("?")[0];

    // Print the extracted playlist ID to the console
    playlistId = extractedPlaylistId;
});






const accessToken = await getAccessToken();
let playlistSongs = await fetchReference(accessToken, "playlists/" + playlistId + "/tracks");

export async function getAccessToken(): Promise<string> {
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
        const token = jsonResponse.access_token;
        console.log(jsonResponse);
        return token;
    } else {
        console.log(response.statusText);
        throw new Error(`Request failed! Status code: ${response.status} ${response.statusText}`);
    }
}

async function fetchReference(token: string, reference: string): Promise<any> {
    const result = await fetch("https://api.spotify.com/v1/" + reference, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}









//Math.floor(Math.random() * 29)
let startTime: number;

const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
const sourceElement = document.getElementById('previewUrl') as HTMLSourceElement;
const songNameElement = document.getElementById('songName') as HTMLElement;
const songArtistElement = document.getElementById('songArtist') as HTMLElement;
const imageUrlElement = document.getElementById('imageUrl') as HTMLImageElement;
const revealButton = document.getElementById('revealButton') as HTMLButtonElement;
const replayButton = document.getElementById('replayButton') as HTMLButtonElement; // Button for replay
const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;

async function intializeGame() {
    const morePlaylistSongs = await fetchReference(accessToken, "playlists/" + playlistId + "/tracks" + `?limit=1&offset=${Math.floor(Math.random() * playlistSongs.total)}`)
    const randomSong = morePlaylistSongs.items[0].track;
    const audioUrl: string = randomSong.preview_url;

    console.log(randomSong.preview_url)
    console.log(randomSong.name)
    console.log(randomSong.artists[0].name)
    console.log(randomSong.album.images[0].url)

    document.getElementById("songName")!.innerText = randomSong.name;
    document.getElementById("songArtist")!.innerText = randomSong.artists[0].name;
    document.getElementById("imageUrl")!.setAttribute("src", randomSong.album.images[0].url);



    sourceElement.src = audioUrl;
    audioElement.load(); // Ensure the new source is loaded

    startTime = Math.floor(Math.random() * 29); // Set the starting time for the audio
    const playDuration = 0.5; // Play for 5 seconds before pausing

    // Function to play the audio and pause after the specified duration
    function playAndPauseAudio() {
        if (startTime < audioElement.duration) {
            audioElement.currentTime = startTime; // Set the starting point
        }
        audioElement.play(); // Start playing

        // Pause the audio after the specified duration
        setTimeout(() => {
            audioElement.pause();
            console.log("Audio paused after " + playDuration + " seconds.");
        }, playDuration * 1000); // Convert seconds to milliseconds
    }

    // Wait until the audio metadata is loaded before setting currentTime
    audioElement.addEventListener('loadedmetadata', () => {
        playAndPauseAudio(); // Initial play and pause logic
    });

    // Set up the song details but hide them until the button is clicked
    songNameElement.innerText = randomSong.name;
    songArtistElement.innerText = randomSong.artists[0].name;
    imageUrlElement.src = randomSong.album.images[0].url;

    // Show the song details when the "Reveal" button is clicked
    revealButton.addEventListener('click', () => {
        songNameElement.style.visibility = 'visible';
        songArtistElement.style.visibility = 'visible';
        imageUrlElement.style.visibility = 'visible';
    });

    // Replay the audio from the starting point when the "Replay" button is clicked
    replayButton.addEventListener('click', () => {
        console.log("Replaying audio from " + startTime + " seconds.");
        playAndPauseAudio(); // Reuse the same play-and-pause logic for replay
    });




    // Set the initial volume from the slider
    audioElement.volume = parseFloat(volumeSlider.value);

    // Add an event listener to adjust the audio volume
    if (volumeSlider) {
        volumeSlider.addEventListener('input', () => {
            audioElement.volume = parseFloat(volumeSlider.value);
            console.log("Volume set to: " + audioElement.volume);
        });
    }
}







// Define a function to get and display a new song
async function getNewSong() {
    if (intialized) {
        // Hide song details initially
        const songNameElement = document.getElementById("songName")!;
        const songArtistElement = document.getElementById("songArtist")!;
        const imageUrlElement = document.getElementById("imageUrl")!;

        songNameElement.style.visibility = 'hidden';
        songArtistElement.style.visibility = 'hidden';
        imageUrlElement.style.visibility = 'hidden';

        // Fetch a new song
        playlistSongs = await fetchReference(accessToken, "playlists/" + playlistId + "/tracks");
        let morePlaylistSongs: any;

        for (let i = 0; i <= 4; i++) {
            morePlaylistSongs = await fetchReference(accessToken, "playlists/" + playlistId + "/tracks" + `?limit=1&offset=${Math.floor(Math.random() * playlistSongs.total)}`)
            if (morePlaylistSongs.items[0].track.id !== null) {
                loadingElement.style.visibility = 'hidden'
                loadingElement.innerText = ""
                break;
            }
            console.log(i)
            if (i == 4) {
                console.error("Too much local songs!");
                loadingElement.innerText = "Too much local songs! Please try a different playlist!"
                loadingElement.style.visibility = 'visible'
                imageUrlElement.setAttribute("src", "");
                break;
            }
        }
        const randomSong = morePlaylistSongs.items[0].track;



        // Update the song details
        songNameElement.innerText = randomSong.name;
        songArtistElement.innerText = randomSong.artists[0].name;
        imageUrlElement.setAttribute("src", randomSong.album.images[0].url);

        // Hide song details
        songNameElement.style.visibility = 'hidden';
        songArtistElement.style.visibility = 'hidden';
        imageUrlElement.style.visibility = 'hidden';

        // Update the audio source
        const audioUrl: string = randomSong.preview_url;
        const sourceElement = document.getElementById('previewUrl') as HTMLSourceElement;
        const audioElement = document.getElementById('audioElement') as HTMLAudioElement;

        if (sourceElement && audioElement) {
            sourceElement.src = audioUrl;
            audioElement.load(); // Ensure the new source is loaded
        }

        // Optionally play the new song for a short time
        startTime = Math.floor(Math.random() * 29)
        audioElement.currentTime = startTime; // Set the starting point
        audioElement.play(); // Start playing

        // You can keep or adjust the pause logic here
        setTimeout(() => {
            audioElement.pause();
            console.log("Audio paused after playing.");
        }, 5000); // Change duration as needed
    }
}

// Add event listener for the new song button
const newSongButton = document.getElementById('newSongButton') as HTMLButtonElement;
if (newSongButton) {
    newSongButton.addEventListener('click', getNewSong);
}




console.log("Done!")