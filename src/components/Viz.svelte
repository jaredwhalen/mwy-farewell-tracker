<script>
  import {scaleSequential} from "d3-scale"
  import {volume} from "../stores/global"





  export let shows
  let discography = shows[0].setlist
  let player
  let src;

  let maxNumberOfSongs = shows.map(d => d.setlist.map(a => a.tracks.filter(t => t.played).length).reduce((a, b) => a + b, 0)).sort((a, b) => b - a)[0]
  export let colors;
  let colorScale = scaleSequential(colors).domain([1, maxNumberOfSongs])

  const onHover = (preview_url) => {
    player.pause()
    src = preview_url
    player.play()
  }





  $: src;
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
  {#each shows as show}
    <div class="show">
    <!-- <div class="label">{show.date}</div> -->
      <div class="label">{show.city}, {show.state}</div>
    </div>
  {/each}
  </div>

  <div id="table">
    <div id="discography">
      {#each discography as album}
        <div class="album">
          <h3>{album.name}</h3>
            {#each album.tracks as track}
            <div class="cell">
              <div class="track">{track.name}</div>
            </div>
            {/each}
        </div>
      {/each}
    </div>
    <div id="concerts">
      {#each shows as show}
        <div class="setlist">
          {#each show.setlist as album}
            <div class="album">
              <h3>&nbsp;</h3>
                {#each album.tracks as track}
                  <div class="cell">
                    <div
                      class="track {track.played ? 'played' : 'hidden'}"
                      style="background: {track.played ? colorScale(track.index) : ''}"
                      data-index={track.index}
                      on:mouseenter={() => onHover(track.preview_url)}
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
  }

  #viz {
    // width: 100vw;
    // overflow-x: scroll;
    margin: 0 auto;
    width: fit-content;
  }

  #head {
    padding-left: var(--sidebarWidth);
    height: 120px;
    display: flex;
    font-family: var(--font-sans);
    position: sticky;
    top: 0;
    background: var(--light);
    z-index: 1000;
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
        z-index: 1000;
        transform-origin: left;
        font-size: 14px;
        &::before {
          content: "";
          display: inline-block;
          transform: rotate(45deg) translate(8px, 18px);
          border-left: 1px solid var(--color-offwhite);
          height: calc(var(--cellWidth)/2);
          position: absolute;
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
    position: sticky;
    left: 0px;
    background: var(--light);
    z-index: 1000;
    padding-left: 10px;

    .album {
          padding-right: 10px;
    }

    .album h3, .track {

      text-align: right;
      white-space: nowrap;
      text-overflow: ellipsis;
      width: 100%;
      display: block;
      overflow: hidden
    }

  }

  #concerts {
    display: flex;
    z-index: 100;

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
