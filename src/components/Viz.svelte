<script>
  import tippy from "sveltejs-tippy";
  import {scaleSequential} from "d3-scale"
  import {volume} from "../stores/global"
  import getFormattedDate from "../js/getFormattedDate"


  export let shows

  let discography = shows[0].setlist
  let player
  let src;

  export let colors;

  // customized to handle weird names, covers, etc.
  let normalize = str => str
  .replace(/ w\/.*/, "")
  .toLowerCase()
  .replace("two", "2")
  .replace(/[^a-zA-Z ]/g, "")
  .replace("memphis will be laid to waste", "messes of men")

  const onHover = (preview_url, show) => {
    player.pause()
    src = preview_url
    player.play()
  }


  const generateProps = (show, song) => {

    let setlistHTML = show.setlistFlat.map((track, i) => {
      if (normalize(track) == normalize(song)) {
        return `<li class="active">${i + 1}. ${track} <img src="./assets/equalizer-animation.gif"/></li>`
      } else {
        return `<li>${i + 1}. ${track}</li>`
      }
    }).join('')

    let props = {
      allowHTML: true,
      // interactive: true,
      content: `
        <h4>${show.venue}, ${show.city}, ${show.state} on ${getFormattedDate(show.date)}</h4>
        <ul>
          ${setlistHTML}
        </ul>
      `,
    }
    return props
  }

  $: src;



  let everySongPlayed = shows.map(show => {
    return(show.setlist.map(album => {
      return(album.tracks.filter(track => {
        // if (track.played && (track.name == 'We Know Who Our Enemies Are') && album.name == "I Never Said That I Was Brave") {
        //   console.log(show)
        // } else {
          return(track.played)
        // }
      }))
    }).flat().map(d => d.name))
  }).flat()


  let numberOfSongs = [...new Set(everySongPlayed)].length

</script>


  <audio
    bind:this={player}
    bind:volume={$volume[0]}
		{src}
    on:canplay={() => player.play()}
    >
  </audio>

<div id="viz">

  <div id="head">
    <div id="song-counter">
      <dl>
        <dt>{numberOfSongs}</dt>
        <dd>distinct songs</dd>
      </dl>
    </div>
  {#each shows as show}
    <div class="show">
    <div class="label"><a href={show.url} target="_blank">{show.city}, {show.state} – {getFormattedDate(show.date)}</a></div>
      <!-- <div class="label">{show.city}, {show.state}</div> -->
    </div>
  {/each}
  </div>

  <div id="table">
    <div id="discography">
      {#each discography as album, i}
        <div class="album">
          <h3>{album.name}<div class="count">{#if !i}#{/if}</div></h3>
            {#each album.tracks as track}
            {@const count = everySongPlayed.filter(s => s == track.name).length}
            <div class="cell">
              <div class="track">{track.name.replaceAll("<skip>", "")}</div>
              {#if count}<div class="count">{count}</div>{:else}<div class="count"></div>{/if}
            </div>
            {/each}
        </div>
      {/each}
    </div>
    <div id="concerts">
      {#each shows as show}
        {@const colorScale = scaleSequential(colors).domain([1, show.setlistFlat.length]) }
        <div class="setlist">
          {#each show.setlist as album}
            {@const count = album.tracks.filter(track => track.played).length}
            <div class="album">
              <h3>{#if count}<span class="count">{count}</span>{:else}&nbsp;{/if}</h3>
                {#each album.tracks as track}
                  <div class="cell">
                    <div
                      class="track {track.played ? 'played' : 'hidden'}"
                      style="background: {track.played ? colorScale(track.index) : ''}"
                      use:tippy={generateProps(show, track.name)}
                      data-index={track.index}
                      on:click={() => onHover(track.preview_url)}
                      on:mouseenter={() => onHover(track.preview_url, show)}
                      on:mouseleave={() => player.pause()}></div>
                  </div>
                {/each}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">

  :global(:root) {
    --cellWidth: 25px;
    --sidebarWidth: 400px;
    @include mobile {
      --sidebarWidth: 250px;
    }
  }

  :global(.tippy-content) {
    color: var(--color-primary);
    font-family: var(--font-sans);
    font-size: 12px;
  }

  :global(.tippy-content h4) {
    border-bottom: 1px solid;
    font-weight: bold;
    padding-bottom: 5px;
    margin-bottom: 5px;
    font-size: 14px;
  }

  :global(.tippy-content ul) {
    list-style-type: none;
  }

  :global(.tippy-content ul li.active) {
    color: var(--color-offwhite);
    font-weight: bold;
  }

  :global(.tippy-content ul li.active img) {
    width: 15px;
    opacity: 0.75;
  }

  #viz {
    // width: 100vw;
    overflow-x: scroll;
    // margin: 0 auto;
    // width: fit-content;
  }

  #head {
    padding-left: var(--sidebarWidth);
    height: 130px;
    display: flex;
    font-family: var(--font-sans);
    position: sticky;
    top: 0;
    background: var(--light);
    z-index: 20;
    padding-bottom: 20px;
    width: fit-content;
    padding-right: 10px;

    .show {
      position: relative;
      white-space: nowrap;
      min-width: var(--cellWidth);

      .label {
        position: absolute;
        bottom: 0px;
        left: calc(var(--cellWidth)/1.5);
        transform: rotate(-45deg);
        z-index: 20;
        transform-origin: left;
        font-size: 12px;
        &::before {
          content: "";
          display: inline-block;
          transform: rotate(45deg) translate(8px, 18px);
          border-left: 1px solid var(--color-offwhite);
          height: calc(var(--cellWidth)/2);
          position: absolute;
        }

        a {
          color: var(--color-primary);
        }
      }
    }

    #song-counter {
      position: absolute;
      left: 0px;
      top: 0px;
      width: var(--sidebarWidth);
      height: 100%;
      display: flex;
      align-items: end;
      justify-content: flex-end;

      dl {
        text-align: right;
        width: 120px;
        opacity: 0.5;
        dt {
          font-family: var(--font-sans);
          font-size: 24px;
          font-weight: 100;
        }

        dd {
          font-family: var(--font-sans);
          font-size: 12px;
          margin: 0 auto;
        }
      }


    }
  }

  #table {
    display: flex;
    font-family: var(--font-sans);


  }

  .album {
    padding-bottom: 5px;
    h3 {
      padding-bottom: 5px;
      color: var(--color-offwhite);
      font-family: var(--font-serif);

      span {
        font-family: var(--font-sans);
        font-size: 12px;
        color: var(--color-primary);
        text-align: center;
        display: inline-block;
        width: 100%;
        font-weight: 100;
      }

      .count {
        opacity: 0.5;
      }
    }



    .cell {
      height: 25px;
      display: flex;
      align-items: center;
      .track {
        text-align: right;
        width: 100%;
      }
      // border-bottom: 1px solid var(--dark);
    }
  }

  #discography {
    min-width: var(--sidebarWidth);
    max-width: var(--sidebarWidth);
    // position: sticky;
    // left: 0px;
    background: var(--light);
    z-index: 20;
    padding-left: 10px;

    .album {
          padding-right: 10px;
    }

    h3 {
      text-align: right;
      white-space: nowrap;
      text-overflow: ellipsis;
      display: block;
      overflow: hidden;
      // margin-right: 20px;
    }

    .track {
      text-align: right;
      white-space: nowrap;
      text-overflow: ellipsis;
      width: 100%;
      display: block;
      overflow: hidden;
    }

    .count {
      font-family: var(--font-sans);
      font-size: 12px;
      color: var(--color-primary);
      text-align: center;
      display: inline-block;
      font-weight: 100;
      width: 20px;
      text-align: right;
      opacity: 0.5;
    }

  }

  #concerts {
    display: flex;
    z-index: 10;

    .cell {
      width: var(--cellWidth);
      justify-content: center;

      .track {
        width: calc(100% - 1px);
        height: calc(100% - 1px);


        &.played {
          opacity: 0.75;
          // background: white;
          &:hover {
            opacity: 1;
          }
        }

        &.hidden {
          pointer-events: none;
          background: var(--dark);
          opacity: 0.2;
        }
      }
    }
  }


</style>
