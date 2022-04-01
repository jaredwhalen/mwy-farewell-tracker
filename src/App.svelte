<script>
  import Meta from "./Meta.svelte";
  import Header from "./components/Header.svelte"
  import Intro from "./components/Intro.svelte"
  import Legend from "./components/Legend.svelte"
  import Controls from "./components/Controls.svelte"
  import Viz from "./components/Viz.svelte"


  import shows from "./data/shows.json"

  let colors = ["#edf8b1", "#4d98cc"]

</script>

<main id="App">
  <Header/>
  <Intro/>

  <div class="side-by-side">
    <Controls {colors} />
    <Legend {colors} />
  </div>

  <Viz {shows} {colors}/>

</main>

<footer>
<div>Design and code by Jared Whalen | © 2022 Jared Whalen</div>
</footer>

<style lang="scss">

// :global {
//   @import "scss/style.scss";
// }


:global(:root) {
  --light: #4F4F4F;
  --dark: #252525;
  --primary: #EFE6D3;
  --accent: #4d98cc;
  --color-offwhite: #FCFCFD;

  --font-serif: 'PT Serif', serif;
  --font-sans: 'Raleway', sans-serif;
  --font-mwy: 'Libre Baskerville', serif;
}

:global(body) {
  background: var(--light);
  color: var(--primary);
  width: 100%;
  overflow-x: hidden;
}

:global(a) {
  color: var(--accent);
  text-decoration: none;
}

#App {

}

.side-by-side {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 25px;
  margin: 0 auto;
  max-width: 600px;
  position: relative;
  padding: 0 15px
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
