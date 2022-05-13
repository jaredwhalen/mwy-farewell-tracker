function fetchJson(path, defaultVal) {
    return fetch(path)
        .then(data => data.json())
        .catch(() => defaultVal);
}

export async function loadShows() {
    const shows = [];
    const showsList = await fetchJson('./assets/shows.json', []);

    for (let show of showsList) {
        const showData = await fetchJson(`./assets/${show}`, {});

        shows.push(showData);
    }

    return shows;
}
