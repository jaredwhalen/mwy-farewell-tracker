<script>
  import Meta from "./Meta.svelte";
  import Header from "./components/Header.svelte"
  import Intro from "./components/Intro.svelte"
  import Viz from "./components/Viz.svelte"

  import discography from "./data/discography.json"
  import setlists from "./data/setlists.json"


  discography.sort((a,b) => new Date(b.release_date) - new Date(a.release_date))

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
    // console.log(discography)
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


</script>

<main id="App">
  <Header/>
  <Intro/>

  <Viz {shows}/>

</main>

<footer>
<div>Design and code by Jared Whalen | © 2022 Jared Whalen</div>
</footer>

<style lang="scss">

// :global {
//   @import "scss/style.scss";
// }


:global(:root) {
  /* --light: #F9F6E9;
  --dark: #ebe8db;
  --primary: #15293e;
  --accent: #c86dd0; */
  --light: #4F4F4F;
  --dark: #252525;
  --primary: #EFE6D3;
  --accent: #B7AEA1;
  --color-offwhite: #FCFCFD;
  --font-serif: 'PT Serif', serif;
  --font-sans: 'Raleway', sans-serif;
}

:global(body) {
  background: var(--light);
  color: var(--primary);
  width: 100vw;
  overflow-x: hidden;
}

#App {

}


footer {
  max-width: 800px;
  margin: 50px auto 25px;
  * {
    font-family: var(--font-sans);
    text-align: center;
    font-size: 14px;
    color: var(--color-offwhite);
    font-weight: 400;
  }
}

</style>
