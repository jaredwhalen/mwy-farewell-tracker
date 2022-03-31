<script>
  import projectConfig from "../project.config.json";
</script>

<svelte:head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no"
  />
  <meta property="fullbleed" content="false" />
  <meta property="slug" content={projectConfig.project.slug} />
  <link
    rel="icon"
    type="image/png"
    href="https://static.axios.com/img/axiosvisuals-favicon-128x128.png"
    sizes="128x128"
  />
  <meta
    property="apple-fallback"
    content={`fallbacks/${projectConfig.project.slug}-apple.png`}
  />
  <meta
    property="newsletter-fallback"
    content={`fallbacks/${projectConfig.project.slug}-fallback.png`}
  />
  <title>{projectConfig.project.name}</title>
</svelte:head>
