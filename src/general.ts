import { html, Gamemode, Source } from "./constants.ts"
import * as fn from "./functions.ts"

let currentlyFetching = false;
let currentSourceId: string;
let currentGamemode: Gamemode;
instantiatePage()

/**
 * Notes:
 * 
 * Ill probably move out some functions to other files for organization
 * main.ts and functions.ts are going to be redundant, im keeping there here as reference as i write this new file
 * this file will probably be renamed to main.ts after ive finished
 */

//#region LISTENERS
// Button - Process URL
html.button_ProcessUrl.addEventListener('click', () => {
    if (fetching(currentlyFetching)) {
        return
    }
    fetching(true)

    const playlistUrl = html.input_SourceUrl.value;

    addURLToDropdown({
        type: "playlist",
        url: playlistUrl
    })
})

// Button - Remove Source
html.button_RemoveSource.addEventListener('click', () => {
    const selectedSourceId = html.select_SourceDropdown.value;
    if (!selectedSourceId) {
        error("Please select an source to remove.");
        return;
    }

    // Remove from dropdown and local storage
    const selectedSource = html.select_SourceDropdown.querySelector(`option[value="${selectedSourceId}"]`);
    if (selectedSource) {
        html.select_SourceDropdown.removeChild(selectedSource);
    }
    const storedSources = JSON.parse(localStorage.getItem(currentGamemode) || '[]');
    const updatedSources = storedSources.filter((source: { id: string }) => source.id !== selectedSourceId);
    localStorage.setItem(currentGamemode, JSON.stringify(updatedSources));

    // Reset selection to the placeholder source
    html.select_SourceDropdown.value = '';
    guessingDisabled(true) 
})

//#endregion

//#region UTIL FUNCTIONS
function instantiatePage() {
    currentGamemode = 'playlists';
    guessingDisabled(true)
    loadDropdownSources()
}

function guessingDisabled(disabled: {
    submit: boolean,
    skip: boolean,
    guess: boolean,
    nextSong: boolean,
    replay: boolean
} | boolean) {
    if (typeof disabled === 'boolean') {
        html.button_SubmitGuess.disabled = disabled;
        html.button_Skip.disabled = disabled;
        html.input_Guess.disabled = disabled;
        html.button_NextSong.disabled = disabled;
        html.button_Replay.disabled = disabled;
    } else {
        html.button_SubmitGuess.disabled = disabled.submit;
        html.button_Skip.disabled = disabled.skip;
        html.input_Guess.disabled = disabled.guess;
        html.button_NextSong.disabled = disabled.nextSong;
        html.button_Replay.disabled = disabled.replay;
    }
}

function fetching(fetching: boolean) {
    if (fetching) {
        // Show user loading
        html.text_Status.innerText = 'wait wait wait...';

        currentlyFetching = fetching
        return fetching
    } else {
        html.text_Status.innerText = '';

        currentlyFetching = fetching
        return fetching
    }
}

function error(message: string) {
    fetching(false)
    alert(message)
    // Possibly add way to show errors in the app itself instead of using a pop-up
}

//#endregion

//#region SOURCE FUNCTIONS
async function addURLToDropdown(source: Source) {
    // Check url validity
    if (!source.url.includes("https://open.spotify.com/" + source.type + "/")) {
        error(`Please enter a vaild Spotify ${source.type} URL`);
        return;
    }

    currentSourceId = source.url.replace("https://open.spotify.com/" + source.type + "/", '').split('?')[0];
    const sourceData = await fn.fetchSpotify(source.type + "s/" + currentSourceId);

    if (!sourceData.name) {
        error(`Error getting ${source.type}`)
        return
    }

    addSourceToDropdown({
        id: currentSourceId,
        name: sourceData.name
    })
    fetching(false)
    html.input_SourceUrl.value = '';
}

function addSourceToDropdown(source: {
    id: string,
    name: string
}) {
    // Ensure source.name is valid (not undefined or empty)
    if (!source.name) {
        error('Invalid source');
        return;
    }

    // Check if the source is already in the dropdown
    const existingSource = Array.from(html.select_SourceDropdown.options).find(option => option.value === source.id);
    if (existingSource) {
        return;
    }

    // Create dropdown element
    const option = document.createElement('option');
    option.value = source.id;
    option.text = source.name;
    html.select_SourceDropdown.add(option);

    // Get source
    const storedSources = JSON.parse(localStorage.getItem(currentGamemode) || '[]');

    // Don't add duplicates to local storage
    const isSourceStored = storedSources.some((source: { id: string }) => source.id === source.id);
    if (isSourceStored) {
        return;
    }

    // Add source to local storage
    storedSources.push({ id: source.id, name: source.name, highscore: 0 });
    localStorage.setItem(currentGamemode, JSON.stringify(storedSources));
}

function loadDropdownSources() {
    // Clear the dropdown except the placeholder
    const placeholderOption = html.select_SourceDropdown.options[0];
    html.select_SourceDropdown.innerHTML = '';
    html.select_SourceDropdown.add(placeholderOption);

    // Load gamemode sources
    const storedCollections = JSON.parse(localStorage.getItem(currentGamemode) || '[]');
    switch (currentGamemode) {
        case 'playlists':
            storedCollections.forEach((playlist: { id: string, name: string }) => {
                addSourceToDropdown({
                    id: playlist.id, 
                    name: playlist.name
                });
            });
            break;
        case 'artists':
            storedCollections.forEach((artist: { id: string, name: string }) => {
                addSourceToDropdown({
                    id: artist.id, 
                    name: artist.name
                });
            });
            break;
        case 'albums':
            storedCollections.forEach((album: { id: string, name: string }) => {
                addSourceToDropdown({
                    id: album.id, 
                    name: album.name
                });
            });
            break;
    }
}
//#endregion
