import fetch from 'node-fetch';
import 'dotenv/config'
import fs from 'fs'

const artist_spotify_id = "3D4qYDvoPn5cQxtBm4oseo"

let options = {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.SPOTIFY_TOKEN}`,
      "Content-Type": "application/json"
    }
  }

fetch(`https://api.spotify.com/v1/artists/${artist_spotify_id}/albums?market=US&include_groups=album,single`, options).then(response => response.text())
  .then(albums => {


    let removeList = ["0rNQkfrozT5NAIGMQCmZrY", "39P5R1B5XF1dGhpojrukVA", "0kehR2IIZopnzrQmX7vSdn", "5MvGNrIZQfOBuvyXkqXZm3", "5mjQR6Caqn6nC2Wax3n8nf", "2X3mjnQ9n6pzNgLMUGZ8Ex", "2X3mjnQ9n6pzNgLMUGZ8Ex"]
    let filtered = JSON.parse(albums).items.filter(d => !removeList.includes(d.id))

    let arr = filtered.map(d => {
      return ({
        name: d.name,
        release_date: d.release_date,
        id: d.id
      })
    })

    let discography = []

    arr.forEach((d, i) => {
      fetch(`https://api.spotify.com/v1/albums/${d.id}/tracks`, options)
        .then(response => response.text())
        .then(tracks => {
          let obj = {...d, tracks: JSON.parse(tracks).items};
          // console.log(obj)
          discography.push(obj)
        })
        .then(() => fs.writeFileSync('../src/data/discography.json', JSON.stringify(discography)))
        .catch(error => console.log(error));
    })


  }).catch(error => console.log(error));
