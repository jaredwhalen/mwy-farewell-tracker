library(spotifyr)
library(jsonlite)
library(dplyr)
library(stringr)

Sys.setenv(SPOTIFY_CLIENT_ID = 'f178f6312b6c49cba9eaf98a5c40f1a9')
Sys.setenv(SPOTIFY_CLIENT_SECRET = 'f5fb061be4924142a596b362415c3b19')
access_token <- get_spotify_access_token()

x <- jsonlite::read_json("../src/data/shows.json")

create_playlist(user_id, name, public = TRUE, collaborative = FALSE,
                description = NULL, authorization = get_spotify_authorization_code())


add_tracks_to_playlist(playlist_id, uris, position = NULL,
                       authorization = get_spotify_authorization_code())


get_track(id="2JsQHMl5Wqcy6Likcf9mmh", authorization = access_token)

discography <- get_discography(artist = 'mewithoutYou', authorization = access_token)

normalize <- function(str) {
  return(tolower(str_replace_all(str, "[^[:alnum:]]", " ")))
}

makePlaylist <- function(x) {
  name <- paste0("mewithoutYou @ ", x$venue, ", ", x$city, ", ", x$state, " on ", substr(x$date,1,10))
  
  setlist <- x$setlistFlat
  
  ids <- c()
  
  for (song in setlist) {
   
    track_id <- discography %>% 
      filter(normalize(track_name) == normalize(song)) %>% 
      head(1) %>% 
      pull(track_id)
    
    print(paste0(song, " - ", track_id))
  }
}

makePlaylist(x[44][[1]])


songs_list <- list()

for (album in x[44][[1]]$setlist) {
  a <- as.data.frame(album$tracks[[1]])
  songs_list[[length(songs_list) + 1]] <- a
}

bind_rows(songs_list) %>%  View()

as.data.frame(x[44][[1]]$setlist[[1]]$tracks[[1]])%>% View()
