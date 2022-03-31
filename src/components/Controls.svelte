<script>
  import Slider from '@bulatdashiev/svelte-slider';
  import {volume} from "../stores/global"

  export let colors;
</script>

<div id="Controls">
  Turn up the volume to play songs on hover
  <Slider bind:value={$volume} min=0 max=1 step=0.1><span  style="font-size: 20px;">🔊</span></Slider>
</div>


<style>

  div {
    min-width: 30%;
    max-width: 30%;
    font-family: var(--font-sans);
    color: var(--color-offwhite);
  }

  :root {
    --track-bg: #ebebeb;
    --progress-bg: var(--color-offwhite);
    --thumb-bg: transparent;
  }

  span {
    cursor: pointer;
  }

</style>
