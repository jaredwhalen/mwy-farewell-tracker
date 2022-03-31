import App from "./App.svelte";

let target = document.querySelector("body");

// *** Use with Webflow ***
// let target;
// if (myProcess.env.isProd) {
//   target = document.querySelector("main");
// } else {
//   target = document.querySelector("body");
// }
const app = new App({
  target,
});

export default app;
