<script>
  export let colors
</script>

<div id="Legend">
Earlier in set

<svg width="100px" height="20px">
  <defs>
    <linearGradient id="gradient">
      <stop offset="5%"  stop-color="{colors[0]}" />
      <stop offset="95%" stop-color="{colors[1]}" />
    </linearGradient>
  </defs>

  <!-- using my linear gradient -->
  <rect width="100%" height="100%" fill="url('#gradient')"/>
</svg>
Later in set
</div>

<style>
  #Legend {
    padding: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--color-offwhite);
    font-family: var(--font-sans);
  }
</style>
