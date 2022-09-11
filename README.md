# mwy-farewell-tracker

A visualization of mewithoutYou'd farewell tour.

This app works in a few stages

1. `pull-discography.js` uses the Spotify API to retrieve an artist's discography, filter out unwanted albums from a `removeList` array, and write a JSON containing the album info including a preview mp3 url.
2. `pull-setlist.js` uses the setlist.fm API to create a JSON of an artist's concert history.
3. `generate-prod.js` merges these files together and does whatever manual name corrections you need to properly connect the files. The `shows.json` output is the data file used in the actual app.
4. A Svelte app uses `shows.json` to produce the visual. The bulk of this happens in `src/components/Viz.svelte`.

## Setup

To recreate this app for another artist:

1. Create an `.env` file at the project root and add variables for `SETLISTFM_TOKEN` and `SPOTIFY_TOKEN`. You can request a setlist.fm token [here](https://api.setlist.fm/docs/1.0/index.html) and generate a Spotify OAuth token [here](https://developer.spotify.com/console/get-artist/).
2. Change the `artist_spotify_id` variable in `pull-discography.js` to the correct Spotify artist ID. An easy way to find this is from the end of the artst's Spotify webpage URL. For example, mewithoutYou's webpage is `https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo`.

	You will need to replace to IDs in the `removeList` variable with any albums you don't want to include, such as live albums, splits, etc. The app works best if only one version of a particular song exists. This step takes some trial and error so you may want to skip at first and come back to it.
	
	Once complete, run `node scripts/pull-discography.js` to download the discography. 	
3. Change the `artist_mbid` variable in `pull-setlists.js` to the correct Music Brainz artist ID. You can find this ID using their [search tool](https://musicbrainz.org/search). I need to write a better function for paginating through the responses, but for you can add page numbers to the `urls` variable to go back as far as needed for your project.

	Once complete, run `node scripts/pull-setlists` to download the discography. 
	
4. The most tedious part of this project is making the neccessay changes in `generate-prod.js` to successfully join the setlists to the discography. I've commented out the mewithoutYou specific song name fixes to make this repo easier to use for other bands. These were on-the-fly fixes to make the live version work while the tour was happening, so you can probably write better code for your own project, but hopefully they serve as helpful entry points.

	Once complete, run `node scripts/generate-prod.js` to merge the files. 
5. Now that your data files are ready, you can start the app by running `npm run dev`.