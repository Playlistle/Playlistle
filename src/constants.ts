import { Client, Databases, Functions } from "npm:appwrite";

//#region APPWRITE

export const APPWRITE = {
    PROJECT: {
        ID: '67183945001faccf6f50'
    },
    FUNCTIONS: {
        GET_API: {
            ID: '67187c7e002b2aaba4af'
        }
    },
    DATABASES: {
        MAIN: {
            ID: '671c78ce0008a5ad6270',
            COLLECTIONS: {
                PLAYLISTS: {
                    ID: '671c795b00242248cc4f'
                },
                SONGS: {
                    ID: '671c7ba8000d8234b69c'
                }
            }
        }
    }
}

const appwriteClient = new Client().setProject(APPWRITE.PROJECT.ID).setEndpoint('https://cloud.appwrite.io/v1')
export const appwriteDatabases = new Databases(appwriteClient)
export const appwriteFunctions = new Functions(appwriteClient)

//#endregion

//#region HTML

export const html = {

    // Text HTML Elements
    text_Title: document.getElementById('title') as HTMLElement,
    text_Status: document.getElementById('feedback') as HTMLElement,
    text_Score: document.getElementById('score') as HTMLElement,
    text_Highscore: document.getElementById('highscore') as HTMLElement,
    text_Lives: document.getElementById('lives') as HTMLElement,
    text_GameOver: document.getElementById('game-over') as HTMLElement,
    text_Results: document.getElementById('results') as HTMLElement,
    text_SongName: document.getElementById('song-title') as HTMLElement,
    text_GuessLabel: document.getElementById('input-label') as HTMLElement,

    // Button HTML Elements
    button_ProcessUrl: document.getElementById('process-btn') as HTMLButtonElement,
    button_Replay: document.getElementById('replay-btn') as HTMLButtonElement,
    button_NextSong: document.getElementById('newSong-btn') as HTMLButtonElement,
    button_RemoveSource: document.getElementById('remove-btn') as HTMLButtonElement,
    button_Skip: document.getElementById('skip-btn') as HTMLButtonElement,
    button_Share: document.getElementById('copy-btn') as HTMLButtonElement,
    button_PlayAgain: document.getElementById('play-again-btn') as HTMLButtonElement,
    button_UpdateSource: document.getElementById('update-btn') as HTMLButtonElement,
    button_SubmitGuess: document.getElementById('submit-btn') as HTMLButtonElement,

    // Input HTML Elements
    input_SourceUrl: document.getElementById('url-input') as HTMLInputElement,
    input_Guess: document.getElementById('guess-input') as HTMLInputElement,
    input_VolumeSlider: document.getElementById('volume-slider') as HTMLInputElement,

    // Other HTML Elements
    image_SongArtwork: document.getElementById('image-url') as HTMLImageElement,
    audio_Audio: document.getElementById('audio-element') as HTMLAudioElement,
    source_PreviewUrl: document.getElementById('preview-url') as HTMLSourceElement,
    select_SourceDropdown: document.getElementById('option-drpdn') as HTMLSelectElement,
    span_CloseGameOver: document.getElementsByClassName('close')[0] as HTMLSpanElement,

};

//#endregion

//#region TYPES

export type RandomSong = {
    name: string;
    id: string;
    preview_url: string;
    artists: string;
    image: string;
    spotify_url: string;
} | undefined

export type Source = {
    type: SourceType
    url: string
}

export type SourceType =
    "playlist" |
    "album" |
    "artist"

export type Gamemode =
    "playlists" |
    "albums" |
    "artists"

//#endregion