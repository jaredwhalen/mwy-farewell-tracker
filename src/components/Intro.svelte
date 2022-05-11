<script>
  import {isMobile} from "../stores/global"

</script>

<div class="intro">

  <p><span class="firstcharacter">H</span>aving released seven studio albums and five EPs over two decades, mewithoutYou has plenty of songs to choose from when planning the setlists for each night of their farewell tour. Fans of the band know
    that historically setlist can vary greatly from night to night. Even on their “Brother, Sister” anniversary tour where they band played the album in full, with lengthy encores they managed to not repeat the
    same setlist twice.</p>

  <p>To visualize this assortment (and just as an opportunity to geek out about an amazing band), I am using <a target="_blank" src="https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html">setlist.fm</a> data to visualize what songs the band plays on each night. The color indicates the
    position in the set a song is played. {#if $isMobile} Tap on{:else}Hover over{/if} a square to listen to the song and see that show's entire setlist. This app will update as new setlists become available.</p>

  <p>See anything off? Have ideas on how to make this better? Send me an email at <a href="mailto:jared.m.whalen@gmail.com">jared.m.whalen@gmail.com</a></p>

</div>

<style lang="scss">
  .intro {
    text-align: left;
    font-family: var(--font-sans);
    line-height: 1.5;
    max-width: 600px;
    margin: 25px auto;
    padding: 0 15px;

    .firstcharacter {
      float: left;
      font-style: italic;
      font-family: 'Libre Baskerville', serif;
      font-size: 75px;
      line-height: 60px;
      padding-top: 4px;
      padding-right: 8px;
      padding-left: 3px;
    }

    p {
      margin-block-start: 1em;
      margin-block-end: 1em;
    }

    a {

    }
  }
</style>
