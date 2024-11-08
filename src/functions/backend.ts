// deno-lint-ignore-file no-explicit-any
import { ExecutionMethod, Query, Models, Permission, Role } from "npm:appwrite";
import { SimplifiedArtist } from "npm:spotify-types"

import { APPWRITE, appwriteDatabases, appwriteFunctions } from "../constants.ts"

let cachedSongs: string[] = [];



//! THIS SCRIPT HAS NOT BEEN CLEANED UP YET



//#region API FETCH
/**
 * ill do this later
 * @param reference something
 * @returns i forgor
 */
export async function fetchSpotify(reference: string) {
    const maxTries = 3;
    let count = 0

    while (true) {
        try {
            const promise = await appwriteFunctions.createExecution(
                APPWRITE.FUNCTIONS.GET_API.ID,
                undefined,
                false,
                reference,
                ExecutionMethod.GET
            );
            const response = JSON.parse(promise.responseBody)
            return response
        } catch (error) {
            // handle exception
            console.log("Retying Fetch...")
            count++
            if (count == maxTries) {
                alert("error happened idk why, reload the page and u should be good :thumbs-up:")
                throw error;
            }
        }
    }
}
//#endregion

//#region DATABASE
/**
 * a
 * @param collectionID a
 * @param documentID a
 * @param data a
 * @returns a
 */
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

/**
 * a
 * @param collectionID a
 * @param documentID a
 * @param data a
 */
export function databaseUpdate(collectionID: string, documentID: string, data: Partial<Omit<Models.Document, keyof Models.Document>>) {
    appwriteDatabases.updateDocument(
        APPWRITE.DATABASES.MAIN.ID,
        collectionID,
        documentID,
        data
    )
}

/**
 * a
 * @param collectionID a
 * @param documentID a
 */
export function databaseDelete(collectionID: string, documentID: string) {
    appwriteDatabases.deleteDocument(
        APPWRITE.DATABASES.MAIN.ID,
        collectionID,
        documentID
    )
}

/**
 * a
 * @param collectionID a
 * @param documentID a
 * @returns a
 */
async function databaseGet(collectionID: string, documentID: string) {
    return await appwriteDatabases.getDocument(
        APPWRITE.DATABASES.MAIN.ID,
        collectionID,
        documentID
    )
}

/**
 * a
 * @param collectionID a
 * @param queries a
 * @returns a
 */
async function databaseList(collectionID: string, queries: string[]) {
    return await appwriteDatabases.listDocuments(
        APPWRITE.DATABASES.MAIN.ID,
        collectionID,
        queries
    )
}
//#endregion

//#region I DONT KNOW WHAT TO NAME THIS SECTION LMAO PLEASE HELP
/**
 * a
 * @param playlistUrl a
 * @returns a
 */
export async function randomSongFromPlaylist(playlistUrl: string) {

    const url = playlistUrl
    // Test for vaild URL
    if (!playlistUrl.startsWith("https://open.spotify.com/playlist/")) {
        alert("Please enter a valid Spotify Playlist URL.");
        return;
    }
    playlistUrl = playlistUrl.replace("https://open.spotify.com/playlist/", "").split("?")[0];

    let validSongFound = false;
    let attempts = 0;

    const playlist = await fetchSpotify(`playlists/${playlistUrl}`)

    if (playlist.tracks.total > 300) {
        alert("Too many songs in the playlist, please use a playlist under 300 songs! (We are working to increase this number in the future)");
        return;
    }

    cachedSongs = await getPlaylistSongNames(url) as string[]

    while (!validSongFound && attempts < 5) {
        attempts++;

        const randNumber = Math.floor(Math.random() * playlist.tracks.total)
        const randomSongInfo = await fetchSpotify(`playlists/${playlistUrl}/tracks?limit=1&offset=${randNumber}`);

        if (randomSongInfo.items[0].track) {
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
        }

        console.log("not quite")

        // If after 5 attempts no valid song is found, playlist is not viable
        if (attempts === 5 && !validSongFound) {
            alert("Too many unavailable songs! Please use a different playlist")
            return;
        }
    }
}

/**
 * a
 * @param playlistUrl a
 * @param bypass a
 * @returns a
 */
export async function getPlaylistSongNames(playlistUrl: string, bypass?: boolean) {
    // Test for vaild URL
    if (!playlistUrl.startsWith("https://open.spotify.com/playlist/")) {
        alert("Please enter a valid Spotify Playlist URL.");
        return;
    }
    playlistUrl = playlistUrl.replace("https://open.spotify.com/playlist/", "").split("?")[0];

    // Test to if source is already in the database
    if (!bypass) {
        try {
            await databaseGet(APPWRITE.DATABASES.MAIN.COLLECTIONS.PLAYLISTS.ID, playlistUrl)

            // Get random song from source
            const list = await databaseList(APPWRITE.DATABASES.MAIN.COLLECTIONS.PLAYLISTS.ID, [
                Query.equal('$id', playlistUrl)
            ])
            cachedSongs = list.documents[0].song_names;
            return await cachedSongs;

        } catch {
            // Continue...
            console.log("Playlist not stored, creating...")
        }
    }

    // Get songs from spotify
    const playlist = await fetchSpotify(`playlists/${playlistUrl}`)
    const playlistSongs: any[] = [];
    const limit = 100
    let offset = 0

    do {
        const batch = await fetchSpotify(`playlists/${playlistUrl}/tracks?limit=${limit}&offset=${offset}`)
        for (const track of batch.items) {
            if ((track !== null) && track.track.id && track.track.preview_url) {
                playlistSongs.push({
                    name: track.track.name,
                    id: track.track.id,
                    $id: track.track.id,
                    preview_url: track.track.preview_url,
                    artists: track.track.artists.map((artist: SimplifiedArtist) => artist.name).join(', '),
                    image: track.track.album.images[0].url,
                    spotify_url: track.track.external_urls.spotify
                })
            }
        }
        offset += limit
    } while (offset < playlist.tracks.total);

    // Add source to database
    if (playlist.images == null) {
        alert("Cannot use playlist, please try using another one")
        return;
    }

    if (bypass) {
        return playlistSongs.map(track => track.artists + " - " + track.name)
    }

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
    cachedSongs = list.documents[0].song_names;
    return cachedSongs

}

//#endregion