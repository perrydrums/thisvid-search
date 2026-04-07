import React, { useState, useEffect } from 'react';

const SimpleSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [hidePrivate, setHidePrivate] = useState(false);
  const [minDuration, setMinDuration] = useState(0);
  const [sortOption, setSortOption] = useState('relevance');

  // Selected videos (My Gallery)
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [viewMode, setViewMode] = useState('search'); // 'search' | 'gallery'

  // Load selected videos from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('myVideoGallery');
      if (saved) {
        setSelectedVideos(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Could not load gallery from localStorage', e);
    }
  }, []);

  // Save selected videos to localStorage when updated
  useEffect(() => {
    localStorage.setItem('myVideoGallery', JSON.stringify(selectedVideos));
  }, [selectedVideos]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setViewMode('search');

    try {
      const response = await fetch(`/.netlify/functions/videos?search=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error('Error al buscar videos: ' + response.statusText);
      }

      const data = await response.json();
      setResults(data.videos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectVideo = (video) => {
    const isSelected = selectedVideos.some(v => v.url === video.url);
    if (isSelected) {
      setSelectedVideos(selectedVideos.filter(v => v.url !== video.url));
    } else {
      setSelectedVideos([...selectedVideos, video]);
    }
  };

  // Convert "MM:SS" duration to seconds for filtering/sorting
  const getDurationInSeconds = (durationStr) => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  // Apply filters and sorting
  const getFilteredAndSortedVideos = () => {
    let filtered = results;

    if (hidePrivate) {
      filtered = filtered.filter(v => !v.isPrivate);
    }

    if (minDuration > 0) {
      filtered = filtered.filter(v => getDurationInSeconds(v.duration) >= minDuration * 60);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortOption === 'viewsDesc') return (b.views || 0) - (a.views || 0);
      if (sortOption === 'viewsAsc') return (a.views || 0) - (b.views || 0);
      if (sortOption === 'durationDesc') return getDurationInSeconds(b.duration) - getDurationInSeconds(a.duration);
      if (sortOption === 'durationAsc') return getDurationInSeconds(a.duration) - getDurationInSeconds(b.duration);
      return 0; // relevance or default
    });

    return filtered;
  };

  const fetchRecommendations = async (videoUrl) => {
    // Advanced feature: fetch category tags for a video to suggest similar searches
    try {
      const response = await fetch(`/.netlify/functions/videoDetails?url=${encodeURIComponent(videoUrl)}`);
      const data = await response.json();
      if (data.success && data.category) {
        alert(`¡Inspiración! Este video es de la categoría "${data.category}". Intenta buscar eso para encontrar más similares.`);
        setQuery(data.category);
        setViewMode('search');
        // setTimeout(() => handleSearch(), 100);
      } else {
        alert("No se encontraron recomendaciones automáticas para este video.");
      }
    } catch (e) {
      alert("Error al buscar recomendaciones.");
    }
  };

  const displayedVideos = viewMode === 'search' ? getFilteredAndSortedVideos() : selectedVideos;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Búsqueda Pro</h1>
        <div>
          <button
            onClick={() => setViewMode('search')}
            style={btnStyle(viewMode === 'search')}
          >
            Búsqueda
          </button>
          <button
            onClick={() => setViewMode('gallery')}
            style={{...btnStyle(viewMode === 'gallery'), marginLeft: '10px'}}
          >
            Mi Galería ({selectedVideos.length})
          </button>
        </div>
      </header>

      {viewMode === 'search' && (
        <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe tu búsqueda aquí..."
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={loading}
              style={actionBtnStyle}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '15px', padding: '15px', backgroundColor: '#f0f2f5', borderRadius: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hidePrivate}
                onChange={(e) => setHidePrivate(e.target.checked)}
              />
              Ocultar Privados
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <label>Duración Mínima (min):</label>
              <input
                type="number"
                min="0"
                value={minDuration}
                onChange={(e) => setMinDuration(Number(e.target.value))}
                style={{ width: '60px', padding: '5px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <label>Ordenar por:</label>
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ padding: '5px' }}>
                <option value="relevance">Relevancia</option>
                <option value="viewsDesc">Más Vistos</option>
                <option value="viewsAsc">Menos Vistos</option>
                <option value="durationDesc">Más Largos</option>
                <option value="durationAsc">Más Cortos</option>
              </select>
            </div>
          </div>
        </form>
      )}

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      {viewMode === 'gallery' && selectedVideos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Tu galería está vacía. Busca videos y selecciónalos para guardarlos aquí.
        </div>
      )}

      {viewMode === 'search' && !loading && results.length === 0 && query && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No se encontraron resultados.
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        {displayedVideos.map((video, idx) => {
          const isSelected = selectedVideos.some(v => v.url === video.url);

          return (
            <div key={idx} style={{
              border: `2px solid ${isSelected ? '#4CAF50' : '#ddd'}`,
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#fff',
              transition: 'transform 0.2s',
              position: 'relative'
            }}>
              {/* Thumbnail */}
              <div style={{ position: 'relative', width: '100%', height: '180px', backgroundColor: '#000' }}>
                <img
                  src={video.avatar}
                  alt={video.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/250x180?text=No+Image' }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '5px',
                  right: '5px',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {video.duration}
                </span>
                {video.isPrivate && (
                  <span style={{
                    position: 'absolute',
                    top: '5px',
                    left: '5px',
                    backgroundColor: 'rgba(255,0,0,0.8)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    PRIVADO
                  </span>
                )}
              </div>

              {/* Metadata */}
              <div style={{ padding: '10px' }}>
                <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', height: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <a href={`https://thisvid.com${video.url}`} target="_blank" rel="noreferrer" style={{ color: '#333', textDecoration: 'none' }}>
                    {video.title || 'Sin Título'}
                  </a>
                </h3>

                <div style={{ fontSize: '12px', color: '#666', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>👁️ {video.views ? video.views.toLocaleString() : 0} vistas</span>
                  <span>📅 {video.date || 'Desconocido'}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                  <button
                    onClick={() => toggleSelectVideo(video)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: isSelected ? '#f44336' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected ? '❌ Quitar de Galería' : '⭐ Guardar en Galería'}
                  </button>

                  {viewMode === 'gallery' && (
                    <button
                      onClick={() => fetchRecommendations(video.url)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '5px'
                      }}
                    >
                      💡 Buscar Recomendados
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

// Simple inline styles
const inputStyle = {
  flex: 1,
  padding: '10px',
  fontSize: '16px',
  borderRadius: '4px',
  border: '1px solid #ccc'
};

const actionBtnStyle = {
  padding: '10px 20px',
  fontSize: '16px',
  cursor: 'pointer',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontWeight: 'bold'
};

const btnStyle = (isActive) => ({
  padding: '8px 16px',
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: isActive ? '#333' : '#e0e0e0',
  color: isActive ? '#fff' : '#333',
  border: 'none',
  borderRadius: '20px',
  fontWeight: 'bold',
  transition: 'background-color 0.2s'
});

export default SimpleSearch;
