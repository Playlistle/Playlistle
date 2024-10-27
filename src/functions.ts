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
                ALBUMS: {
                    ID: '671c798600109d0a59c7'
                },
                ARTISTS: {
                    ID: '671c797d0030f64abfb0'
                },
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

// TODO: add song preview url validation to this function like the playlist one
export async function randomSongFromAlbum(albumUrl: string) {
    // Test for vaild URL
    if (!albumUrl.startsWith("https://open.spotify.com/album/")) {
        alert("Please enter a valid Spotify Album URL.");
        return;
    }
    albumUrl = albumUrl.replace("https://open.spotify.com/album/", "").split("?")[0];

    // Test to if source is already in the database
    try {
        await databaseGet(APPWRITE.DATABASES.MAIN.COLLECTIONS.ALBUMS.ID, albumUrl)

        // Get random song from source
        const hey = await databaseList(APPWRITE.DATABASES.MAIN.COLLECTIONS.ALBUMS.ID, [
            Query.equal('$id', albumUrl)
        ])
        cachedSongs = hey.documents[0].songs.map((track: any) => track.artists + ' - ' + track.name)
        return hey.documents[0].songs[Math.floor(Math.random() * hey.documents[0].songs.length)]
    } catch {
        // Continue...
        console.log("Album not stored, creating...")
    }

    // Get songs from spotify
    const album = await fetchSpotify(`albums/${albumUrl}`)
    const albumSongs: any[] = [];
    for (const track of album.tracks.items) {
        if (track.preview_url) {
            albumSongs.push({
                name: track.name,
                id: track.id,
                $id: track.id,
                preview_url: track.preview_url,
                artists: track.artists.map((artist: SimplifiedArtist) => artist.name).join(', '),
                image: album.images[0].url,
                spotify_url: track.external_urls.spotify
            })
        }
    }

    // Add source to database
    await databasePost(APPWRITE.DATABASES.MAIN.COLLECTIONS.ALBUMS.ID, album.id, {
        name: album.name,
        image: album.images[0].url,
        id: album.id,
        artists: album.artists.map((artist: SimplifiedArtist) => artist.name).join(', '),
        songs: albumSongs,
        spotify_url: album.external_urls.spotify
    })

    // Get random song from source
    const hey = await databaseList(APPWRITE.DATABASES.MAIN.COLLECTIONS.ALBUMS.ID, [
        Query.equal('$id', album.id)
    ])
    return hey.documents[0].songs[Math.floor(Math.random() * hey.documents[0].songs.length)]

}

export async function randomSongFromArtist(artistUrl: string) {
    // Test for vaild URL
    if (!artistUrl.startsWith("https://open.spotify.com/artist/")) {
        alert("Please enter a valid Spotify Artist URL.");
        return;
    }
    artistUrl = artistUrl.replace("https://open.spotify.com/artist/", "").split("?")[0];

    // Test to if source is already in the database
    try {
        await databaseGet(APPWRITE.DATABASES.MAIN.COLLECTIONS.ARTISTS.ID, artistUrl)

        // Get random song from source
        const hey = await databaseList(APPWRITE.DATABASES.MAIN.COLLECTIONS.ARTISTS.ID, [
            Query.equal('$id', artistUrl)
        ])
        cachedSongs = hey.documents[0].songs.map((track: any) => track.artists + ' - ' + track.name)
        return hey.documents[0].songs[Math.floor(Math.random() * hey.documents[0].songs.length)]
    } catch {
        // Continue...
        console.log("Artist not stored, creating...")
    }

    // Get songs from spotify
    const artist = await fetchSpotify(`artists/${artistUrl}`)
    let artistSongs: any[] = [];
    let albums: Album[] = [];
    let offset = 0;
    const limit = 50; // Max limit for album fetches
    let totalAlbums = 0;

    // Fetch albums with pagination to collect all albums
    do {
        const artistAlbums = await fetchSpotify(`artists/${artistUrl}/albums?limit=${limit}&offset=${offset}`);
        albums = albums.concat(artistAlbums.items as Album[]);
        totalAlbums = artistAlbums.total;
        offset += limit;
    } while (offset < totalAlbums);

    // Group albums into batches of 20 IDs
    const albumIds = albums.map(album => album.id);
    const albumBatches: string[] = [];
    for (let i = 0; i < albumIds.length; i += 20) {
        albumBatches.push(albumIds.slice(i, i + 20).join(","));
    }

    // Fetch tracks for multiple albums at once, using the batches
    for (const batch of albumBatches) {
        const albumsData = await fetchSpotify(`albums?ids=${batch}`);
        for (const album of albumsData.albums as Album[]) {
            for (const track of Array.isArray(album.tracks) ? album.tracks : album.tracks.items) {
                if (track.artists.some((artist: SimplifiedArtist) => artist.id === artistUrl)) {
                    if (track.preview_url) {
                        artistSongs.push({
                            name: track.name,
                            id: track.id,
                            $id: track.id,
                            preview_url: track.preview_url,
                            artists: track.artists.map((artist: SimplifiedArtist) => artist.name).join(', '),
                            image: album.images[0].url,
                            spotify_url: track.external_urls.spotify
                        })
                    }
                }
            }
        }
    }

    // Filter out songs with undefined preview urls
    artistSongs = artistSongs.filter(song => song.preview_url !== undefined);

    // Filter out duplicate songs
    const uniqueSongsMap = new Map<string, Track>();
    for (const song of artistSongs) {
        const key = `${song.name}-${song.artists}`;
        if (!uniqueSongsMap.has(key)) {
            uniqueSongsMap.set(key, song);
        }
    }
    artistSongs = Array.from(uniqueSongsMap.values());

    // Add source to database
    await databasePost(APPWRITE.DATABASES.MAIN.COLLECTIONS.ARTISTS.ID, artist.id, {
        name: artist.name,
        image: artist.images[0].url,
        id: artist.id,
        songs: artistSongs,
        spotify_url: artist.external_urls.spotify
    })

    // Get random song from source
    const hey = await databaseList(APPWRITE.DATABASES.MAIN.COLLECTIONS.ARTISTS.ID, [
        Query.equal('$id', artist.id)
    ])
    return hey.documents[0].songs[Math.floor(Math.random() * hey.documents[0].songs.length)]
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
        const hey = await databaseList(APPWRITE.DATABASES.MAIN.COLLECTIONS.PLAYLISTS.ID, [
            Query.equal('$id', playlistUrl)
        ])
        return await hey.documents[0].song_names
        
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
    const hey = await databaseList(APPWRITE.DATABASES.MAIN.COLLECTIONS.PLAYLISTS.ID, [
        Query.equal('$id', playlist.id)
    ])
    return hey.documents[0].song_names[Math.floor(Math.random() * hey.documents[0].songs.length)]

}

//#endregion