import fs from 'fs'
import {
  readFile
} from 'fs/promises';
import {
  spawn
} from 'child_process'

const discography = JSON.parse(
  await readFile(
    new URL('../src/data/discography.json',
      import.meta.url)
  )
);

const setlists = JSON.parse(
  await readFile(
    new URL('../src/data/setlists.json',
      import.meta.url)
  )
);

//
// I've commented out the mewithoutYou specific song name fixes to make this repo
// easier to use for other bands. These were on-the-fly fixes to make the live
// version work while the tour was happening, so you can probably write better
// code for your own project.

discography.sort((a, b) => new Date(b.release_date) - new Date(a.release_date))

setlists.forEach(d => d.$.eventDate = new Date(d.$.eventDate.split("-").reverse().join("-")))

setlists.sort((a, b) => new Date(a.$.eventDate) - new Date(b.$.eventDate))

let fixSetlistName = str => str
  // .replace("Cemetery", "Cleo's Ferry Cemetery")

let normalize = str => str
  // .replace("Paper-Hanger", "Paper Hanger")
  // .replace("Gentleman", "Gentlemen")
  // .replace("two", "2")
  .toLowerCase()
  .replace(/[^a-zA-Z ]/g, "")

let tour = []
setlists.forEach(d => {

  let obj = {
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
      if (!!!s.$.tape) {
        // if (!!s.info && s.info[0].includes("Memphis")) {
        //   obj.setlist.push(normalize('Memphis Will Be Laid to Waste'))
        //   obj.setlist.push(normalize(fixSetlistName(s.$.name)))
        //   obj.setlistFlat.push(`${s.$.name} w/ Memphis Will Be Laid to Waste`)
        // } else if ((!!s.info && s.info[0].includes("acoustic")) && (s.$.name == "Winter Solstice"))  {
        //   obj.setlist.push(normalize("Winter Solstice (alt. version)"))
        //   obj.setlistFlat.push("Winter Solstice (alt. version)")
        // } else if ((!!s.info && s.info[0].includes("Julian")) && (s.$.name == "Son of a Widow"))  {
        //   obj.setlist.push(normalize("Julian the Onion"))
        //   obj.setlistFlat.push("Julian the Onion")
        //   obj.setlist.push(normalize(fixSetlistName(s.$.name)))
        //   obj.setlistFlat.push(fixSetlistName(s.$.name))
        // } else {
          obj.setlist.push(normalize(fixSetlistName(s.$.name)))
          obj.setlistFlat.push(fixSetlistName(s.$.name))
        // }
      }
    }))
    tour.push(obj)
  }
})

let shows = []

tour.forEach(s => {
  let showObj = {
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
        played: setlist.includes(normalize(track.name)),
        id: track.id
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

// filtered.forEach(show => {
//   if (show.setlist.map(album => album.tracks.filter(track => track.played)).flat().length != show.setlistFlat.length) {
//     if (show.setlistFlat.findIndex(s => s.includes("Memphis") && ((show.setlist.map(album => album.tracks.filter(track => track.played)).flat().length - 1) != show.setlistFlat.length))) {
//       console.log("Uneven setlist match but includes 'Memphis Will Be Laid to Waste' mashup")
//     } else {
//       console.log("Uneven setlist match.")
//     }
//   }
// })

let currentData = JSON.parse(fs.readFileSync('./src/data/shows.json'));

fs.writeFileSync('./src/data/shows.json', JSON.stringify(filtered))

if (currentData.length < filtered.length) {
  console.log("new shows added")

  // Only include if you add an update script and want it to run when new shows are added
  // const ls = spawn("./scripts/update.sh");

  ls.stdout.on("data", data => {
    console.log(`stdout: ${data}`);
  });

  ls.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
  });

  ls.on('error', (error) => {
    console.log(`error: ${error.message}`);
  });

  ls.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });
}
