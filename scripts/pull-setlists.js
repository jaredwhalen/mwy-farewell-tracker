import fetch from 'node-fetch';
import xml2js from 'xml2js'
import fs from 'fs'
import 'dotenv/config'

const artist_mbid = "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283"



// let url = `https://api.setlist.fm/rest/1.0/artist/${artist_mbid}/setlists?p=1`
// fetch(url, {
//     method: 'GET',
//     headers: {
//       Accept: "application/xml",
//       "X-Api-Key": process.env.SETLISTFM_TOKEN
//     }
//   })
//   .then(response => response.text())
//   .then(xml => {
//     xml2js.parseString(xml, (err, result) => {
//       return(result)
//       // const json = JSON.stringify(result);
//     })
//   })


const urls = [1, 2, 3];
const arr = []
const der = async (x) => {
    const f = await fetch(`https://api.setlist.fm/rest/1.0/artist/${artist_mbid}/setlists?p=${x}`, {
      method: 'GET',
      headers: {
        Accept: "application/xml",
        "X-Api-Key": process.env.SETLISTFM_TOKEN
      }
    })
    const xml = await f.text()
    const json = await xml2js.parseString(xml, (err, result) => arr.push(result.setlists.setlist))
    return json;
};

urls.forEach(async(url) => {
  await der(url)
  // console.log(res.setlists)
  console.log(arr)
  fs.writeFileSync('../src/data/setlists.json', JSON.stringify(arr.flat()))
});



// Promise.all(urls.map(x =>
//   fetch(`https://api.setlist.fm/rest/1.0/artist/${artist_mbid}/setlists?p=${x}`, {
//     method: 'GET',
//     headers: {
//       Accept: "application/xml",
//       "X-Api-Key": process.env.SETLISTFM_TOKEN
//     }
//   }).then(response => response.text())
// )).then((xml) => {
//   xml2js.parseString(xml, (err, result) => console.log(result))
// })

//
// Promise.all(urls.map(x =>
//    fetch(`https://api.setlist.fm/rest/1.0/artist/${artist_mbid}/setlists?p=${x}`,  {
//        method: 'GET',
//        headers: {
//          Accept: "application/xml",
//          "X-Api-Key": process.env.SETLISTFM_TOKEN
//        }
//      })
//      .then(response => response.text())
//      .then(xml => {
//          xml2js.parseString(xml, (err, result) => {
//            return(result)
//            // const json = JSON.stringify(result);
//          })
//        }).then(data => {
//      console.log(data)
//      })
// ))
