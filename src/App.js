import React, { useEffect, useState } from "react";
import { API_KEY, CHANNEL_IDS } from "./config";
import "./App.css";

const fetchPlaylistId = async (channelId) => {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`
  );
  const data = await res.json();
  return data.items[0]?.contentDetails?.relatedPlaylists?.uploads;
};

const fetchPlaylistVideos = async (playlistId, pageToken = "") => {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=10&pageToken=${pageToken}&key=${API_KEY}`
  );
  const data = await res.json();
  return data;
};

function App() {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [nextPageTokens, setNextPageTokens] = useState({});
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    const loadInitialVideos = async () => {
      const playlistIds = await Promise.all(CHANNEL_IDS.map(fetchPlaylistId));
      setPlaylists(playlistIds);

      let combinedVideos = [];
      const tokens = {};

      for (const playlistId of playlistIds) {
        const data = await fetchPlaylistVideos(playlistId);
        tokens[playlistId] = data.nextPageToken;
        data.items.forEach((item) => {
          const { title, thumbnails, publishedAt, resourceId } = item.snippet;
          combinedVideos.push({
            id: resourceId.videoId,
            title,
            thumbnail: thumbnails.medium.url,
            publishedAt,
            playlistId,
          });
        });
      }
      combinedVideos.sort(
        (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
      );
      setVideos(combinedVideos);
      setNextPageTokens(tokens);
    };

    loadInitialVideos();
  }, []);

  const loadMore = async () => {
    let moreVideos = [...videos];
    const tokens = { ...nextPageTokens };

    for (const playlistId of playlists) {
      const pageToken = tokens[playlistId];
      if (!pageToken) continue;

      const data = await fetchPlaylistVideos(playlistId, pageToken);
      tokens[playlistId] = data.nextPageToken;

      data.items.forEach((item) => {
        const { title, thumbnails, publishedAt, resourceId } = item.snippet;
        moreVideos.push({
          id: resourceId.videoId,
          title,
          thumbnail: thumbnails.medium.url,
          publishedAt,
          playlistId,
        });
      });
    }

    moreVideos.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );
    setVideos(moreVideos);
    setNextPageTokens(tokens);
  };

  const currentVideo = currentIndex != null ? videos[currentIndex] : null;

  return (
    <div className="App">
      <h1>KidTube</h1>
      {currentVideo ? (
        <div className="player">
          <iframe
            title={currentVideo.title}
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${currentVideo.id}?rel=0`}
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
          <h2>{currentVideo.title}</h2>
          <div className="controls">
            <button onClick={() => setCurrentIndex(null)}>Home</button>
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              Previous
            </button>
            <button
              onClick={async () => {
                if (currentIndex < videos.length - 1) {
                  setCurrentIndex(currentIndex + 1);
                } else {
                  await loadMore();
                  setCurrentIndex(currentIndex + 1);
                }
              }}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="feed">
          {videos.map((video, i) => (
            <div
              key={video.id}
              className="video-card"
              onClick={() => setCurrentIndex(i)}
            >
              <img src={video.thumbnail} alt={video.title} />
              <p>{video.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
