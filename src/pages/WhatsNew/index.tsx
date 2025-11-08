import React, { useEffect, useState } from 'react';

import '../../App.css';
import LoadingBar from '../../components/LoadingBar';
import Header from '../../components/Header';

type Video = {
  uploader: string;
  title: string;
  thumbnail: string;
  url: string;
  tags?: string[];
  category?: string;
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
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [enriching, setEnriching] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);

  // Get unique uploaders
  const uniqueUploaders = Array.from(new Set(videos.map((video) => video.uploader))).sort();

  // Get unique categories from all videos
  const allCategories = Array.from(
    new Set(videos.filter((video) => video.category).map((video) => video.category || '')),
  ).sort();

  // Filter videos by selected uploader and category
  const filteredVideos = videos.filter((video) => {
    if (selectedUploader && video.uploader !== selectedUploader) {
      return false;
    }
    if (selectedCategory && video.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const enrichVideos = async (videosToEnrich: Video[]) => {
    setEnriching(true);
    setEnrichmentProgress(0);

    const batchSize = 5; // Process 5 videos at a time
    let enrichedCount = 0;

    for (let i = 0; i < videosToEnrich.length; i += batchSize) {
      const batch = videosToEnrich.slice(i, i + batchSize);

      const enrichmentPromises = batch.map(async (video) => {
        try {
          const response = await fetch(`/videoDetails?url=${encodeURIComponent(video.url)}`);
          const data = await response.json();

          if (data.success) {
            return {
              ...video,
              category: data.category || '',
            };
          }
          return video;
        } catch (err) {
          console.error(`Error enriching video ${video.url}:`, err);
          return video;
        }
      });

      const enrichedBatch = await Promise.all(enrichmentPromises);

      enrichedCount += enrichedBatch.length;
      const currentCount = enrichedCount;

      // Update videos state with enriched data
      setVideos((prevVideos) => {
        const updated = prevVideos.map((v) => {
          const enriched = enrichedBatch.find((e) => e.url === v.url);
          return enriched || v;
        });
        // Update localStorage periodically
        if (currentCount % 10 === 0 || currentCount === videosToEnrich.length) {
          localStorage.setItem('tvass-whats-new-videos', JSON.stringify(updated));
        }
        return updated;
      });

      setEnrichmentProgress(currentCount);
    }

    setEnriching(false);
  };

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
        // Start async enrichment
        enrichVideos(data.videos);
      }
    } catch (err) {
      setError('An error occurred while fetching videos. Please try again.');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load and enrich videos from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('tvass-whats-new-videos');
    if (stored) {
      try {
        const parsedVideos = JSON.parse(stored);
        setVideos(parsedVideos);
        // Check if any videos need enrichment (missing category)
        const needsEnrichment = parsedVideos.filter((v: Video) => !v.category);
        if (needsEnrichment.length > 0) {
          enrichVideos(needsEnrichment);
        }
      } catch (err) {
        console.error('Error parsing stored videos:', err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <>
                <div className="container-section">
                  <div className="container-section-header">
                    <h2>Uploaders ({uniqueUploaders.length})</h2>
                  </div>
                  <div className="form-container-scroll" style={{ maxHeight: '30vh', overflowY: 'auto' }}>
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
                {allCategories.length > 0 && (
                  <div className="container-section">
                    <div className="container-section-header">
                      <h2>Category</h2>
                    </div>
                    <div className="form-container-scroll" style={{ maxHeight: '30vh', overflowY: 'auto' }}>
                      <div className="select-wrapper">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">All Categories</option>
                          {allCategories.map((category) => {
                            const count = videos.filter((v) => v.category === category).length;
                            return (
                              <option key={category} value={category}>
                                {category} ({count})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {enriching && (
                  <div className="container-section">
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Enriching videos... {enrichmentProgress} / {videos.length}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="form-container">
          {videos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <h2>Videos {selectedUploader && `- ${selectedUploader}`}</h2>
              <div className="form-container-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
