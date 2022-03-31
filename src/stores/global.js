import { writable, derived } from "svelte/store";

export const windowWidth = writable(window.innerWidth);
export const windowHeight = writable(window.innerHeight);

export const isMobile = derived(windowWidth,
    $windowWidth => $windowWidth <= 560 ? true : false
)

export const isLarge = derived(windowWidth,
    $windowWidth => $windowWidth > 1200 ? true : false
)