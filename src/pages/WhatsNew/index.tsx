import React, { useState } from 'react';

import '../../App.css';
import LoadingBar from '../../components/LoadingBar';
import Header from '../../components/Header';

type Video = {
  uploader: string;
  title: string;
  thumbnail: string;
  url: string;
};

const WhatsNew = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [videos, setVideos] = useState<Video[]>(() => {
    const stored = localStorage.getItem('tvass-whats-new-videos');
    return stored ? JSON.parse(stored) : [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUploader, setSelectedUploader] = useState<string>('');

  // Get unique uploaders
  const uniqueUploaders = Array.from(new Set(videos.map((video) => video.uploader))).sort();

  // Filter videos by selected uploader
  const filteredVideos = selectedUploader
    ? videos.filter((video) => video.uploader === selectedUploader)
    : videos;

  const fetchVideos = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');
    setVideos([]);
    // Clear localStorage when starting a new fetch
    localStorage.removeItem('tvass-whats-new-videos');

    try {
      const response = await fetch(
        `/friendsEvents?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to fetch videos');
        setLoading(false);
        return;
      }

      setVideos(data.videos || []);
      // Save to localStorage
      if (data.videos && data.videos.length > 0) {
        localStorage.setItem('tvass-whats-new-videos', JSON.stringify(data.videos));
      }
    } catch (err) {
      setError('An error occurred while fetching videos. Please try again.');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingBar loading={loading} />
      <Header backButtonUrl="/" />
      <div className="container">
        <div className="results-container">
          <div className="results-scroll-container">
            <div className="container-section">
              <div className="container-section-header">
                <h2>What's New</h2>
              </div>
              <div>
                <div className="form-columns" style={{ marginBottom: '12px' }}>
                  <label htmlFor="tv-username">Thisvid Username</label>
                  <input
                    type="text"
                    id="tv-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        fetchVideos();
                      }
                    }}
                    placeholder="Enter your username"
                    disabled={loading}
                    autoComplete="off"
                    data-1p-ignore
                  />
                </div>
                <div className="form-columns" style={{ marginBottom: '12px' }}>
                  <label htmlFor="tv-credential">Credential</label>
                  <input
                    type="password"
                    id="tv-credential"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        fetchVideos();
                      }
                    }}
                    placeholder="Enter your credential"
                    disabled={loading}
                    autoComplete="off"
                    data-1p-ignore
                  />
                </div>
                <div className="form-columns">
                  <div></div>
                  <button type="button" onClick={fetchVideos} disabled={loading}>
                    {loading ? 'Fetching...' : 'Fetch Videos'}
                  </button>
                </div>
              </div>
              {error && (
                <div style={{ marginTop: '12px', color: 'var(--accent-color)' }}>{error}</div>
              )}
            </div>
            {videos.length > 0 && (
              <div className="container-section">
                <div className="container-section-header">
                  <h2>Uploaders ({uniqueUploaders.length})</h2>
                </div>
                <div className="form-container-scroll" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div
                    style={{
                      padding: '8px',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      backgroundColor: selectedUploader === '' ? 'var(--accent-color)' : 'var(--input-background-color)',
                      borderRadius: '4px',
                      color: selectedUploader === '' ? 'white' : 'var(--text-color)',
                    }}
                    onClick={() => setSelectedUploader('')}
                  >
                    All ({videos.length})
                  </div>
                  {uniqueUploaders.map((uploader) => {
                    const count = videos.filter((v) => v.uploader === uploader).length;
                    return (
                      <div
                        key={uploader}
                        style={{
                          padding: '8px',
                          marginBottom: '4px',
                          cursor: 'pointer',
                          backgroundColor:
                            selectedUploader === uploader ? 'var(--accent-color)' : 'var(--input-background-color)',
                          borderRadius: '4px',
                          color: selectedUploader === uploader ? 'white' : 'var(--text-color)',
                        }}
                        onClick={() => setSelectedUploader(uploader)}
                      >
                        {uploader} ({count})
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="form-container">
          {videos.length > 0 && (
            <div>
              <h2>Videos {selectedUploader && `- ${selectedUploader}`}</h2>
              <div className="form-container-scroll">
                {filteredVideos.map((video, index) => (
                  <div key={`${video.url}-${index}`} style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{video.uploader}</div>
                    <div
                      style={{ cursor: 'pointer', color: 'var(--accent-color)' }}
                      onClick={() => window.open(video.url, '_blank')}
                    >
                      {video.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WhatsNew;
