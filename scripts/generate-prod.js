import fs from 'fs'
import { readFile } from 'fs/promises';

const discography = JSON.parse(
  await readFile(
    new URL('../src/data/discography.json', import.meta.url)
  )
);

const setlists = JSON.parse(
  await readFile(
    new URL('../src/data/setlists.json', import.meta.url)
  )
);

discography.sort((a,b) => new Date(b.release_date) - new Date(a.release_date))

setlists.forEach(d => d.$.eventDate = new Date(d.$.eventDate.split("-").reverse().join("-")))

setlists.sort((a,b) => new Date(a.$.eventDate) - new Date(b.$.eventDate))

let normalize = str => str
// specific songs
.replace("Paper-Hanger", "Paper Hanger")
.replace("Gentleman", "Gentlemen")
// end
.toLowerCase()
.replace("two", "2")
.replace(/[^a-zA-Z ]/g, "")

let tour = []
setlists.forEach(d => {
  
  let obj = {
    id: d.$.id,
    date: d.$.eventDate,
    venue: d.venue[0].$.name,
    city: d.venue[0].city[0].$.name,
    state: d.venue[0].city[0].$.stateCode,
    url: d.url,
    setlistFlat: [],
    setlist: [],
  }

  if (!!d.sets[0].set) {
    d.sets[0].set.map(x => x.song.map(s => {
      obj.setlist.push(normalize(s.$.name))
      obj.setlistFlat.push(s.$.name)
    }))
    tour.push(obj)
  }
})

let shows = []

tour.forEach(s => {
  let showObj = {
    id: s.id,
    date: s.date,
    venue: s.venue,
    city: s.city,
    state: s.state,
    url: s.url,
    setlist: [],
    setlistFlat: s.setlistFlat
  }

  let setlist = s.setlist

  discography.map(album => {
    let albumObj = {
      name: album.name,
      tracks: []
    }
    album.tracks.map(track => {
      let trackObj = {
        name: track.name,
        preview_url: track.preview_url,
        played: setlist.includes(normalize(track.name))
      }

      if (trackObj.played) {
        trackObj.index = setlist.indexOf(normalize(track.name))
      }

      albumObj.tracks.push(trackObj)
    })
    showObj.setlist.push(albumObj)
  })

  shows.push(showObj)

})



let sd = new Date("2022-05-09T00:00:00.000Z").getTime()
let ed = new Date().getTime()

let filtered = shows
.filter(d => {
  var time = new Date(d.date).getTime();
  return (sd <= time && time <= ed);
});

filtered.forEach(show => {
  if (show.setlist.map(album => album.tracks.filter(track => track.played)).flat().length != show.setlistFlat.length) {
    console.log("Uneven setlist match.")
  }
})

const currentFiles = JSON.parse(
  await readFile(
    new URL('../public/assets/shows.json', import.meta.url)
  )
);

const fileList = [...currentFiles];

if (currentFiles.length < filtered.length) {
  for (let show of filtered) {
    if (!currentFiles.includes(show.id)) {
      fs.writeFileSync(`../public/assets/${show.id}.json`, JSON.stringify(show))
      fileList.push(`${show.id}.json`)
    }
  }
  console.log("new shows added")
}

fs.writeFileSync('../public/assets/shows.json', JSON.stringify(fileList))
