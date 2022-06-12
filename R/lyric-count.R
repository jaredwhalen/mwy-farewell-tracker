
#######
# GET GENIUS LYRIC PAGE URLS
#######

library(httr)
library(jsonlite)
library(readr)
library(dplyr)
library(rvest)

genius_token <- 'ns5R9DqwLyAMLn0mZSYeGbCe01c5E37FCVMDehk8CuP2uG4RLrtX76nGDCTXY7NI'

request_song_info <- function(song_name, artist) {
  base_url = 'https://api.genius.com'
  headers = c("Authorization" = paste0("Bearer ", genius_token))
  
  search_url = URLencode(paste0(base_url, '/search?q=', song_name, ' ', artist))
  
  res <- GET(search_url, add_headers(headers))
  
  res_json <- fromJSON(rawToChar(res$content))
  
  hits <- res_json$response$hits
  
  # print(hits)
  
  url <- ''
  
  normalize_name <- function(str) {
    gsub("[[:punct:]]", "", gsub("&", "and", tolower(str)))
  }
  
  for (i in 1:nrow(res_json$response$hits)) {
    row <- res_json$response$hits[i,]
    if (normalize_name(artist) == normalize_name(row$result$artist_names)) {
      url <- row$result$url
    }
  }
  
  return(url)
}

url_list <- list()

# Manual fix names
songs <- read_csv("songs-73.csv")

for (i in 1:nrow(songs)) {
  print(i)
  row <- songs[i,]
  try({
    
    song <- row$song
    artist <- row$artist
    print(paste0("Getting url for '", song, "' by ", artist))
    
    url <- request_song_info(song, artist)
    
    print(url)
    x <- tibble(
      song,
      artist,
      url
    )
    
    url_list[[length(url_list) + 1]] <- x
  })
  
}

url_df <- bind_rows(url_list) %>%  distinct()

write_csv(url_df, "url_df.csv")




# Manual fix
# Check for name issues / missing bands
artists_with_name_issues <- url_df %>%
  mutate(missing = ifelse(!is.na(url), 'not missing', 'missing')) %>%
  group_by(artist, missing) %>%
  summarise(
    count = n()
  ) %>%
  spread(
    key = missing,
    value = count
  ) %>%
  filter(missing > 0 & is.na(`not missing`))

# For adding fixed names

temp <- filter(url_df, is.na(url)) %>% 
  select(artist, song) %>%
  left_join(fix) %>%
  filter(!is.na(fix)) %>% 
  mutate(
    artist = case_when(
      is.na(fix) ~ artist,
      TRUE ~ fix
    )
  ) %>%
  select(-fix)

url_list_fixed <- list()

for (i in 1:nrow(temp)) {
  print(i)
  row <- temp[i,]
  try({
    
    song <- row$song
    artist <- row$artist
    print(paste0("Getting url for '", song, "' by ", artist))
    
    url <- request_song_info(song, artist)
    
    print(url)
    x <- tibble(
      song,
      artist,
      url
    )
    
    url_list_fixed[[length(url_list_fixed) + 1]] <- x
  })
  
}

url_list_fixed_df <- bind_rows(url_list_fixed)

url_df.withoutIssues <- filter(url_df, !artist %in% pull(artists_with_name_issues, artist))

url_list_fixed_df <- rbind(url_df.withoutIssues, url_list_fixed_df) %>%  distinct()

url_df <- url_list_fixed_df

write_csv(url_df, "url_df.csv", na = '')

write_clip(unique(url_df$artist))

#######
# SCRAPE LYRICS
#######

url_df <- read_csv("url_df.csv")

lyrics_list <- list()

for (i in 1:nrow(url_df)) {
  print(i)
  row <- url_df[i,]
  
  # if (!is.na(url)) {
  try({
    
    song <- row$song
    artist <- row$artist
    url <- row$url
    print(paste0("Getting lyrics for '", song, "' by ", artist))
    
    html <- read_html(url)
    
    lyrics <- html %>% 
      html_node('div[data-lyrics-container=true]') %>% 
      html_text()
    
    print(substr(lyrics, 1, 50))
    
    x <- tibble(
      song,
      artist,
      url,
      lyrics
    )
    
    lyrics_list[[length(lyrics_list) + 1]] <- x
  })
  # }
  
  
}

lyrics_df <- bind_rows(lyrics_list) %>%  distinct() %>% mutate(lyrics = gsub("\\[.*?\\]", "", lyrics))

write_csv(lyrics_df, "lyrics_df.csv", na = '')
