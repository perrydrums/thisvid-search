import React, { useState } from 'react';

import '../../App.css';
import Header from '../../components/Header';
import Result from '../../components/Result';

type Video = {
  uploader: string;
  title: string;
  thumbnail: string;
  url: string;
};

const WhatsNew = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchVideos = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');
    setVideos([]);

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
    } catch (err) {
      setError('An error occurred while fetching videos. Please try again.');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVideos();
  };

  return (
    <>
      <Header backButtonUrl="/" />
      <div className="container">
        <div className="results-container">
          <div className="results-scroll-container">
            <div className="container-section">
              <div className="container-section-header">
                <h2>What's New</h2>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-columns" style={{ marginBottom: '12px' }}>
                  <label htmlFor="username">Thisvid Username</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    disabled={loading}
                  />
                </div>
                <div className="form-columns" style={{ marginBottom: '12px' }}>
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                </div>
                <div className="form-columns">
                  <div></div>
                  <button type="submit" disabled={loading}>
                    {loading ? 'Fetching...' : 'Fetch Videos'}
                  </button>
                </div>
              </form>
              {error && (
                <div style={{ marginTop: '12px', color: 'var(--accent-color)' }}>{error}</div>
              )}
            </div>
            {videos.length > 0 && (
              <div className="container-section">
                <div className="container-section-header">
                  <h2>New Videos ({videos.length})</h2>
                </div>
                <div className="results">
                  {videos.map((video, index) => (
                    <Result
                      key={`${video.url}-${index}`}
                      title={video.title}
                      url={video.url}
                      duration=""
                      views={0}
                      date=""
                      imageSrc={video.thumbnail}
                      uploader={video.uploader}
                      noDebug={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="form-container">
          {videos.length > 0 && (
            <div>
              <h2>Videos by Uploader</h2>
              <div className="form-container-scroll">
                {videos.map((video, index) => (
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
