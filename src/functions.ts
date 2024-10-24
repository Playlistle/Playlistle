// deno-lint-ignore-file no-explicit-any
import { Client, Functions, ExecutionMethod } from "npm:appwrite";

//#region VARIABLES

let currentPlaylistUrl: any;
let playlistSongs: any;
let currentAlbumUrl: any;
let albumInfo: any;

//#endregion

//#region INTERFACES

// Define interfaces for Spotify API responses
interface Album {
    id: string;
    name: string;
    tracks: {
        items: Track[];
    };
    images: Images[];
}

interface Track {
    preview_url: string;
    artists: Artist[];
    name: string;
}

interface Artist {
    id: string;
    name: string;
}

interface Images {
    url: string;
}

interface RandomSong {
    preview_url: string | undefined;
    name: string | undefined;
    artists: string | undefined;
    image: string | undefined;
    viable_source?: boolean;
    filtered_songs?: number;
}

//#endregion

//#region ACCESS TOKEN FUNCTIONS

// Fetch data from backend
export async function fetchReference(reference: string): Promise<any> {
    
    const client = new Client();

    await client
        .setProject('67183945001faccf6f50') 
        .setEndpoint('https://cloud.appwrite.io/v1')
        
    const functions = new Functions(client);

    const promise = await functions.createExecution(
        '67187c7e002b2aaba4af',
        '',
        false,
        reference,
        ExecutionMethod.GET
    );

    const out = JSON.parse(promise.responseBody)
    return out
}

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

//#endregion

//#region RANDOM SONG FUNCTIONS

// Get random song info from Spotify artist URL
export async function getRandomSongFromArtist(artistUrl: string) {

    if (!artistUrl.startsWith("https://open.spotify.com/artist/")) {
        alert("Please enter a valid Spotify Artist URL.");
        return;
    }

    artistUrl = artistUrl.replace("https://open.spotify.com/artist/", "").split("?")[0];

    // Explicitly define the type for albums
    let artistSongUrls: RandomSong[] = [];
    let albums: Album[] = [];
    let offset = 0;
    const limit = 50; // Max limit for album fetches
    let totalAlbums = 0;

    // Fetch albums with pagination to collect all albums
    do {
        const artistAlbums = await fetchReference(`artists/${artistUrl}/albums?limit=${limit}&offset=${offset}`);
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
        const albumsData = await fetchReference(`albums?ids=${batch}`);
        for (const album of albumsData.albums as Album[]) {
            for (const track of album.tracks.items) {
                // Ensure the track belongs to the artist
                if (track.artists.some(artist => artist.id === artistUrl)) {
                    artistSongUrls.push({
                        artists: track.artists.map(artist => artist.name).join(', '),
                        preview_url: track.preview_url,
                        image: album.images[0].url,
                        name: track.name
                    });
                }
            }
        }
    }

    const initialCount = artistSongUrls.length;
    artistSongUrls = artistSongUrls.filter(song => song.preview_url !== undefined);
    const filteredCount = initialCount - artistSongUrls.length;
    
    const uniqueSongsMap = new Map<string, RandomSong>();
    for (const song of artistSongUrls) {
        const key = `${song.name}-${song.artists}`; // Create a unique key
        if (!uniqueSongsMap.has(key)) {
            uniqueSongsMap.set(key, song); // Store the song if it's not already in the map
        }
    }
    
    artistSongUrls = Array.from(uniqueSongsMap.values());

    const randomSong = artistSongUrls[Math.floor(Math.random() * artistSongUrls.length)];
    randomSong.filtered_songs = filteredCount
    return randomSong;
}

// Get random song info from Spotify playlist URL
export async function getRandomSongFromPlaylist(playlistUrl: string) {
    let validSongFound = false;
    let attempts = 0;

    if (!playlistUrl.startsWith("https://open.spotify.com/playlist/")) {
        alert("Please enter a valid Spotify Playlist URL.");
        return;
    }

    playlistUrl = playlistUrl.replace("https://open.spotify.com/playlist/", "").split("?")[0];

    if (currentPlaylistUrl !== playlistUrl) {
        playlistSongs = await fetchReference(`playlists/${playlistUrl}/tracks`);
    }
    currentPlaylistUrl = playlistUrl

    while (!validSongFound && attempts < 5) {
        attempts++;

        const randomSongInfo = await fetchReference(`playlists/${playlistUrl}/tracks?limit=1&offset=${Math.floor(Math.random() * playlistSongs.total)}`);
        const track = randomSongInfo.items[0].track

        if (track.preview_url) {
            validSongFound = true;

            const randomSong: RandomSong = {
                artists: track.artists.map((artist: Artist) => artist.name).join(', '),
                preview_url: track.preview_url,
                image: track.album.images[0].url,
                name: track.name,
                viable_source: true
            };
            return randomSong;
        }

        // If after 5 attempts no valid song is found, playlist is not viable
        if (attempts === 5 && !validSongFound) {
            const randomSong: RandomSong = {
                artists: undefined,
                preview_url: undefined,
                image: undefined,
                name: undefined,
                viable_source: false
            };
            return randomSong;
        }
    }
}

// Get random song info from Spotify playlist URL
export async function getRandomSongFromAlbum(albumUrl: string) {
    if (!albumUrl.startsWith("https://open.spotify.com/album/")) {
        alert("Please enter a valid Spotify Album URL.");
        return;
    }

    albumUrl = albumUrl.replace("https://open.spotify.com/album/", "").split("?")[0];

    if (currentAlbumUrl !== albumUrl) {
        albumInfo = await fetchReference(`albums/${albumUrl}`);
    }
    currentAlbumUrl = albumUrl

    const randomSongInfo = await fetchReference(`albums/${albumUrl}/tracks?limit=1&offset=${Math.floor(Math.random() * albumInfo.total_tracks - 1)}`);
    const track = randomSongInfo.items[0];

    const randomSong: RandomSong = {
        artists: track.artists.map((artist: Artist) => artist.name).join(', '),
        preview_url: track.preview_url,
        image: albumInfo.images[0].url,
        name: track.name
    };

    return randomSong;
}

//#endregion