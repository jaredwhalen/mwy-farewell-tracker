<script>
  export let colors
</script>

<div id="Legend">
  <h4>Setlist position</h4>
  <div class="flex">
    Earlier
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
    Later
  </div>

</div>

<style lang="scss">

  #Legend {
    padding: 25px;
    font-family: var(--font-sans);
    @include mobile {
      margin: 0 auto;
    }

    h4 {
      color: var(--color-offwhite);
      font-family: var(--font-sans);
      text-align: center;
      padding-bottom: 15px;
    }

    .flex {

      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: var(--primary);
      text-transform: uppercase;
      font-size: 12px;

    }

  }
</style>
