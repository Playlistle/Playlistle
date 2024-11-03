// deno-lint-ignore-file no-explicit-any
import { Client, Databases, Functions, ExecutionMethod, Query, Models, Permission, Role } from "npm:appwrite";
import { SimplifiedArtist, Album, Track } from "npm:spotify-types"

//#region CONSTANTS
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

let cachedSongs: string[] = [];
const appwriteClient = new Client().setProject(APPWRITE.PROJECT.ID).setEndpoint('https://cloud.appwrite.io/v1')
export const appwriteDatabases = new Databases(appwriteClient)
export const appwriteFunctions = new Functions(appwriteClient)

//#endregion

//#region UTILITY FUNCTIONS

// Function to normalize a string by removing punctuation, spaces, and making it lowercase
export function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^\w\s]|_/g, "")
        .replace(/\s+/g, " ");
}

// Function to remove brackets and parentheses from the string
export function removeBrackets(str: string): string {
    return str
        .replace(/ *\[[^\]]*] */g, '')
        .replace(/ *\([^\)]*\) */g, '');
}

// Function to calculate the Levenshtein distance (for detecting close guesses)
export function levenshteinDistance(a: string, b: string): number {
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

// Function to populate autocomplete datalist
export function setupAutocomplete() {
    const datalistElement = document.getElementById("autocomplete-list") as HTMLDataListElement;
    datalistElement.innerHTML = "";
    let datalistHTML = "";

    for (const song of cachedSongs) {
        datalistHTML += `<option value="${song}"></option>`;
    }

    datalistElement.innerHTML = datalistHTML;
    console.log(datalistElement);
}

//#endregion

//#region FUNCTIONS
export async function fetchSpotify(reference: string) {
    const promise = await appwriteFunctions.createExecution(
        APPWRITE.FUNCTIONS.GET_API.ID,
        undefined,
        false,
        reference,
        ExecutionMethod.GET
    );

    const response = JSON.parse(promise.responseBody)
    return response
}

// Post document to the database
async function databasePost(collectionID: string, documentID: string, data: Omit<Models.Document, keyof Models.Document>) {
    try {
        await appwriteDatabases.createDocument(
            APPWRITE.DATABASES.MAIN.ID,
            collectionID,
            documentID,
            data,
            [
                Permission.read(Role.any()),
                Permission.update(Role.any())
            ]
        )
    } catch {
        return;
    }
}

// Update document in the database
function databaseUpdate(collectionID: string, documentID: string, data: Partial<Omit<Models.Document, keyof Models.Document>>) {
    appwriteDatabases.updateDocument(
        APPWRITE.DATABASES.MAIN.ID,
        collectionID,
        documentID,
        data
    )
}

// Delete document in the database
function databaseDelete(collectionID: string, documentID: string) {
    appwriteDatabases.deleteDocument(
        APPWRITE.DATABASES.MAIN.ID,
        collectionID,
        documentID
    )
}

// Get document in the database
async function databaseGet(collectionID: string, documentID: string) {
    return await appwriteDatabases.getDocument(
        APPWRITE.DATABASES.MAIN.ID,
        collectionID,
        documentID
    )
}

// List documents in the database
async function databaseList(collectionID: string, queries: string[]) {
    return await appwriteDatabases.listDocuments(
        APPWRITE.DATABASES.MAIN.ID,
        collectionID,
        queries
    )
}

export async function randomSongFromPlaylist(playlistUrl: string) {
    
    // Test for vaild URL
    if (!playlistUrl.startsWith("https://open.spotify.com/playlist/")) {
        alert("Please enter a valid Spotify Playlist URL.");
        return;
    }
    playlistUrl = playlistUrl.replace("https://open.spotify.com/playlist/", "").split("?")[0];

    let validSongFound = false;
    let attempts = 0;

    const playlist = await fetchSpotify(`playlists/${playlistUrl}`)

    cachedSongs = [] // This will change in the future

    while (!validSongFound && attempts < 5) {
        attempts++;

        const randomSongInfo = await fetchSpotify(`playlists/${playlistUrl}/tracks?limit=1&offset=${Math.floor(Math.random() * playlist.tracks.total)}`);
        const track = randomSongInfo.items[0].track
        console.log(track)

        if (track.preview_url) {
            validSongFound = true;
            const randomSong = {
                name: track.name,
                id: track.id,
                preview_url: track.preview_url,
                artists: track.artists.map((artist: SimplifiedArtist) => artist.name).join(', '),
                image: track.album.images[0].url,
                spotify_url: track.external_urls.spotify
            };
            return randomSong;
        }

        // If after 5 attempts no valid song is found, playlist is not viable
        if (attempts === 5 && !validSongFound) {
            return "Error: Too many unavailable songs!";
        }
    }
}

export async function getPlaylistSongNames(playlistUrl: string) {
    // Test for vaild URL
    if (!playlistUrl.startsWith("https://open.spotify.com/playlist/")) {
        alert("Please enter a valid Spotify Playlist URL.");
        return;
    }
    playlistUrl = playlistUrl.replace("https://open.spotify.com/playlist/", "").split("?")[0];

    // Test to if source is already in the database
    try {
        await databaseGet(APPWRITE.DATABASES.MAIN.COLLECTIONS.PLAYLISTS.ID, playlistUrl)

        // Get random song from source
        const list = await databaseList(APPWRITE.DATABASES.MAIN.COLLECTIONS.PLAYLISTS.ID, [
            Query.equal('$id', playlistUrl)
        ])
        console.log(list.documents[0].song_names);
        cachedSongs = list.documents[0].song_names;
        return await list.documents[0].song_names[Math.floor(Math.random() * list.documents[0].songs.length)];
        
    } catch {
        // Continue...
        console.log("Playlist not stored, creating...")
    }

    // Get songs from spotify
    const playlist = await fetchSpotify(`playlists/${playlistUrl}`)
    const playlistSongs: any[] = [];
    const limit = 100
    let offset = 0

    do {
        const batch = await fetchSpotify(`playlists/${playlistUrl}/tracks?limit=${limit}&offset=${offset}`)
        for (const track of batch.items) {
            if (track.track.id && track.track.preview_url) {
                playlistSongs.push({
                    name: track.track.name,
                    id: track.track.id,
                    $id: track.track.id,
                    preview_url: track.track.preview_url,
                    artists: track.track.artists.map((artist: SimplifiedArtist) => artist.name).join(', '),
                    image: track.track.album.images[0].url,
                    spotify_url: track.track.external_urls.spotify
                })
                console.log("aaaa")
            }
        }
        offset += limit
    } while (offset < playlist.tracks.total);

    // Add source to database

    await databasePost(APPWRITE.DATABASES.MAIN.COLLECTIONS.PLAYLISTS.ID, playlist.id, {
        name: playlist.name,
        image: playlist.images[0].url,
        id: playlist.id,
        owner: playlist.owner.display_name,
        song_names: playlistSongs.map(track => track.artists + " - " + track.name),
        spotify_url: playlist.external_urls.spotify
    })

    // Get random song from source
    const list = await databaseList(APPWRITE.DATABASES.MAIN.COLLECTIONS.PLAYLISTS.ID, [
        Query.equal('$id', playlist.id)
    ])
    console.log(list.documents[0].song_names);
    cachedSongs = list.documents[0].song_names;
    return list.documents[0].song_names[Math.floor(Math.random() * list.documents[0].songs.length)]

}

//#endregion