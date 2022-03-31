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

let normalize = str => str.toLowerCase().replace("two", "2").replace(/[^a-zA-Z ]/g, "")

let tour = []
setlists.map(d => {
  let obj = {
    date: d.$.eventDate,
    venue: d.venue[0].$.name,
    city: d.venue[0].city[0].$.name,
    state: d.venue[0].city[0].$.stateCode,
    setlist: []
  }

  d.sets[0].set.map(x => x.song.map(s => obj.setlist.push(normalize(s.$.name))))

  tour.push(obj)
})

let shows = []

tour.forEach(s => {
  let showObj = {
    date: s.date,
    venue: s.venue,
    city: s.city,
    state: s.state,
    setlist: []
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


let sd = new Date("2021-08-15T00:00:00.000Z").getTime()
let ed = new Date("2022-03-24T00:00:00.000Z").getTime()

let filtered = shows.filter(d => {var time = new Date(d.date).getTime();
                             return (sd <= time && time <= ed);
                            });

fs.writeFileSync('../src/data/shows.json', JSON.stringify(filtered))
