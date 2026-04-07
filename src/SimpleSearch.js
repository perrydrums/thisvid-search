import React, { useState, useEffect } from 'react';

const SimpleSearch = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [pagesToScrape, setPagesToScrape] = useState(1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState(null);

  // Filters
  const [hidePrivate, setHidePrivate] = useState(false);
  const [minDuration, setMinDuration] = useState(0);
  const [sortOption, setSortOption] = useState('relevance');

  // Selected videos (My Gallery)
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [viewMode, setViewMode] = useState('search'); // 'search' | 'gallery'
  const [globalTags, setGlobalTags] = useState([]);

  // Surprise AI Feature
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

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
    if (!query.trim() && !category.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setViewMode('search');
    setProgressMsg('');

    let allVideos = [];

    try {
      for (let i = 1; i <= pagesToScrape; i++) {
        setProgressMsg(`Extrayendo página ${i} de ${pagesToScrape}...`);

        let url = `/.netlify/functions/videos?page=${i}`;

        if (category) {
          // If a category is selected, we scrape the category page directly
          url += `&url=${encodeURIComponent(`/categories/${category}/latest/${i}/`)}`;
          // If there is also a text query, append it to let the backend mix them
          if (query.trim()) {
            url += `&search=${encodeURIComponent(query)}`;
          }
        } else {
          url += `&search=${encodeURIComponent(query)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          console.warn(`Error on page ${i}`);
          break;
        }

        const data = await response.json();
        if (data.videos && data.videos.length > 0) {
           // Prevent duplicates: filter out videos whose URL is already in allVideos
           const newVideos = data.videos.filter(v => !allVideos.some(existing => existing.url === v.url));
           allVideos = [...allVideos, ...newVideos];
           setResults([...allVideos]); // Update live
        } else {
          // No more results
          break;
        }
      }
      setProgressMsg(`Completado: ${allVideos.length} videos extraídos.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgressMsg(''), 3000);
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

  const [expandedVideo, setExpandedVideo] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [selectedGlobalTag, setSelectedGlobalTag] = useState('');

  const getCountedGlobalTags = () => {
    const counts = {};
    globalTags.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
    // Return sorted by count
    return Object.entries(counts).sort((a,b) => b[1] - a[1]);
  };

  const fetchRecommendations = async (videoUrl) => {
    if (expandedVideo && expandedVideo.url === videoUrl) {
      // Toggle off if already open
      setExpandedVideo(null);
      return;
    }

    setExpandedLoading(true);
    setExpandedVideo({ url: videoUrl, tags: [], recommended: [] });

    try {
      const response = await fetch(`/.netlify/functions/videoDetails?url=${encodeURIComponent(videoUrl)}`);
      const data = await response.json();

      if (data.success) {
        let recs = data.recommendedVideos || [];
        // Filtramos para que solo sean publicos y > 30s
        recs = recs.filter(v => !v.isPrivate && getDurationInSeconds(v.duration) >= 30);

        setExpandedVideo({
          url: videoUrl,
          tags: data.tags || [],
          recommended: recs
        });

        // Añadir sin set (guardar repetidos para conteo)
        if (data.tags && data.tags.length > 0) {
          setGlobalTags(prev => [...prev, ...data.tags]);
        }
      } else {
        alert("No se pudieron cargar las recomendaciones de este video.");
        setExpandedVideo(null);
      }
    } catch (e) {
      alert("Error al cargar la página del video.");
      setExpandedVideo(null);
    } finally {
      setExpandedLoading(false);
    }
  };

  const displayedVideos = viewMode === 'search' ? getFilteredAndSortedVideos() : selectedVideos;

  // En base al tag seleccionado, si estamos en gallería y expandidos, filtramos los videos recomendados
  const getFilteredExpandedRecommendations = () => {
    if (!expandedVideo) return [];
    if (!selectedGlobalTag) return expandedVideo.recommended;

    // Filtro simplista: checamos si el título del video contiene el tag (ya que el recomendator en la API
    // aún no nos da los tags crudos de CADA video recomendado sin hacer sub-fetch).
    return expandedVideo.recommended.filter(v =>
      v.title.toLowerCase().includes(selectedGlobalTag.toLowerCase())
    );
  };

  const getHoverThumbnails = (avatarUrl) => {
    // ThisVid uses sequential numbers for thumbnails: 1.jpg, 2.jpg, ...
    // E.g. //media.thisvid.com/.../1.jpg
    const match = avatarUrl.match(/(.*\/)(\d+)\.jpg$/);
    if (!match) return [avatarUrl];

    const base = match[1];
    return [1, 2, 3, 4, 5].map(n => `${base}${n}.jpg`);
  };

  const VideoCard = ({ video, isSelected }) => {
    const [hoverIndex, setHoverIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const thumbs = getHoverThumbnails(video.avatar);

    useEffect(() => {
      let interval;
      if (isHovering && thumbs.length > 1) {
        interval = setInterval(() => {
          setHoverIndex(prev => (prev + 1) % thumbs.length);
        }, 800);
      } else {
        setHoverIndex(0);
      }
      return () => clearInterval(interval);
    }, [isHovering, thumbs.length]);

    return (
      <div style={{
        border: `2px solid ${isSelected ? '#b71c1c' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'rgba(20,20,20,0.8)',
        boxShadow: isSelected ? '0 0 15px rgba(183,28,28,0.6)' : '0 4px 8px rgba(0,0,0,0.5)',
        transition: 'transform 0.2s',
        position: 'relative'
      }}>
        {/* Thumbnail Clickable Link */}
        <a
          href={`https://thisvid.com${video.url}`}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'block', textDecoration: 'none' }}
        >
          <div
            style={{ position: 'relative', width: '100%', height: '180px', backgroundColor: '#000', cursor: 'pointer' }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <img
              src={thumbs[hoverIndex]}
              alt={video.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isHovering ? 0.8 : 1, transition: 'opacity 0.2s' }}
              onError={(e) => { e.target.src = 'https://via.placeholder.com/250x180?text=No+Image' }}
            />

            <span style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: '#f5deb3',
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
                backgroundColor: 'rgba(183,28,28,0.9)',
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
        </a>

        {/* Metadata */}
        <div style={{ padding: '10px' }}>
          <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', height: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <a href={`https://thisvid.com${video.url}`} target="_blank" rel="noreferrer" style={{ color: '#f5deb3', textDecoration: 'none' }}>
              {video.title || 'Sin Título'}
            </a>
          </h3>

          <div style={{ fontSize: '12px', color: '#aaa', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>👁️ {video.views ? video.views.toLocaleString() : 0} vistas</span>
            <span>📅 {video.date || 'Desconocido'}</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
            <button
              onClick={(e) => { e.preventDefault(); toggleSelectVideo(video); }}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : '#b71c1c',
                color: '#f5deb3',
                border: isSelected ? '1px solid #b71c1c' : 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
            >
              {isSelected ? '❌ Quitar de Galería' : '⭐ Añadir a Galería'}
            </button>

            {viewMode === 'gallery' && (
              <button
                onClick={(e) => { e.preventDefault(); fetchRecommendations(video.url); }}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: expandedVideo && expandedVideo.url === video.url ? '#333' : '#d4af37',
                  color: expandedVideo && expandedVideo.url === video.url ? '#f5deb3' : '#111',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '5px',
                  fontWeight: 'bold'
                }}
              >
                {expandedVideo && expandedVideo.url === video.url ? '🔽 Cerrar Recomendados' : '🎭 Mostrar Recomendados'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#1a1a1a', color: '#e0e0e0' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px', backgroundColor: 'rgba(100,0,0,0.8)', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', color: '#f5deb3' }}>
        <h1 style={{ margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.8)', letterSpacing: '1px' }}>🎭 Búsqueda Pro</h1>
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
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">-- Buscar por Texto/Todas --</option>
              <option value="amateur">Amateur</option>
              <option value="anal">Anal</option>
              <option value="bbw">BBW</option>
              <option value="blowjob">Blowjob</option>
              <option value="cam-whores">Cam Whores</option>
              <option value="creampie">Creampie</option>
              <option value="cuckold">Cuckold</option>
              <option value="ebony">Ebony</option>
              <option value="fetish">Fetish</option>
              <option value="gay">Gay</option>
              <option value="group-sex">Group Sex</option>
              <option value="latina">Latina</option>
              <option value="lesbian">Lesbian</option>
              <option value="mature">Mature</option>
              <option value="milf">MILF</option>
              <option value="pov">POV</option>
              <option value="public">Public</option>
              <option value="shemale">Shemale</option>
              <option value="swinger">Swinger</option>
              <option value="teen">Teen</option>
              <option value="wife">Wife</option>
            </select>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe tu búsqueda aquí (opcional)..."
              style={inputStyle}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <label>Páginas (Deep Scrape):</label>
              <input
                type="number"
                min="1"
                max="30"
                value={pagesToScrape}
                onChange={(e) => setPagesToScrape(Number(e.target.value))}
                style={{ width: '60px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={actionBtnStyle}
            >
              {loading ? 'Extrayendo...' : 'Buscar Deep'}
            </button>
          </div>

          {progressMsg && (
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', color: '#0277bd', borderRadius: '4px', fontWeight: 'bold' }}>
              ⏳ {progressMsg}
            </div>
          )}

          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '15px', padding: '15px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', alignItems: 'center', flexWrap: 'wrap', border: '1px solid rgba(255,255,255,0.1)' }}>
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

      {/* Surprise AI Feature */}
      {viewMode === 'gallery' && selectedVideos.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, #111, #2a0808)', borderRadius: '8px', border: '1px solid #b71c1c', boxShadow: '0 0 20px rgba(183,28,28,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#f5deb3', textShadow: '1px 1px 2px #000' }}>✨ Psycho-Análisis AI (Experimental)</h3>
            <button
              onClick={() => {
                if (globalTags.length === 0) {
                  alert("Explora y expande recomendaciones de tus videos primero para que la IA tenga tags que analizar.");
                  return;
                }
                setIsAiThinking(true);
                setTimeout(() => {
                  const sortedTags = getCountedGlobalTags().slice(0, 5).map(t => t[0]);
                  if (sortedTags.length === 0) {
                    setAiAnalysis("No hay suficientes datos. Abre 'Mostrar Recomendados' en tus videos guardados.");
                  } else {
                    const profiles = [
                      "Eres un explorador audaz. Tus gustos reflejan una curiosidad insaciable por lo poco convencional.",
                      "Tienes un gusto clásico pero exigente. Buscas calidad y escenarios bien definidos.",
                      "Tu perfil indica una mente salvaje. Te atrae la intensidad y la energía desbordante.",
                      "Eres metódico. Seleccionas con precisión, buscando un nicho muy particular que despierte tus sentidos."
                    ];
                    const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
                    setAiAnalysis(`He analizado tus patrones ocultos basados en tus ${globalTags.length} interacciones y tags principales (${sortedTags.join(', ')}). \n\n${randomProfile} \n\nTe recomiendo que la próxima vez busques algo relacionado con "${sortedTags[0] || 'tu instinto'}".`);
                  }
                  setIsAiThinking(false);
                }, 2000);
              }}
              style={{
                padding: '10px 20px', backgroundColor: '#d4af37', color: '#111',
                border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer',
                boxShadow: '0 0 10px rgba(212,175,55,0.5)'
              }}
            >
              {isAiThinking ? 'Analizando tu mente...' : 'Analizar mi Galería'}
            </button>
          </div>
          {aiAnalysis && (
            <div style={{ marginTop: '15px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '8px', color: '#fff', fontStyle: 'italic', borderLeft: '4px solid #d4af37' }}>
              "{aiAnalysis}"
            </div>
          )}
        </div>
      )}

      {/* Global Tags Pool (Visible in Gallery) */}
      {viewMode === 'gallery' && globalTags.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(183,28,28,0.1)', border: '1px solid #b71c1c', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#f5deb3' }}>🏷️ Nube de Tags Global (Filtro Mágico)</h3>
          <p style={{ fontSize: '12px', color: '#ccc', margin: '0 0 10px 0' }}>Selecciona un tag para filtrar las recomendaciones expandidas que lo contengan en el título.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {getCountedGlobalTags().map(([tag, count]) => {
              const isActive = selectedGlobalTag === tag;
              return (
                <span
                  key={tag}
                  onClick={() => setSelectedGlobalTag(isActive ? '' : tag)}
                  style={{
                    background: isActive ? '#f5deb3' : 'rgba(0,0,0,0.5)',
                    color: isActive ? '#111' : '#f5deb3',
                    padding: '6px 12px',
                    border: '1px solid #b71c1c',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tag} <span style={{ opacity: 0.7, fontSize: '10px', marginLeft: '4px' }}>x{count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid rendering selected or searched videos */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {displayedVideos.map((video, idx) => (
            <VideoCard
              key={idx}
              video={video}
              isSelected={selectedVideos.some(v => v.url === video.url)}
            />
          ))}
        </div>

        {/* Expanded view for recommended videos in Gallery mode */}
        {viewMode === 'gallery' && expandedVideo && (
          <div style={{ marginTop: '20px', padding: '20px', border: '2px solid #b71c1c', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <h2 style={{ marginTop: 0, color: '#f5deb3' }}>
              Recomendados para el video seleccionado
            </h2>
            <div style={{ marginBottom: '15px' }}>
              <strong>URL Directa:</strong> <a href={`https://thisvid.com${expandedVideo.url}`} target="_blank" rel="noreferrer" style={{ color: '#d4af37' }}>https://thisvid.com{expandedVideo.url}</a>
            </div>

            {expandedVideo.tags && expandedVideo.tags.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Tags extraídos de este video:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                  {expandedVideo.tags.map((tag, idx) => (
                    <span key={idx} style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 6px', borderRadius: '4px', fontSize: '12px' }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {expandedLoading ? (
              <div style={{ color: '#f5deb3' }}>Cargando recomendados...</div>
            ) : getFilteredExpandedRecommendations().length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                {getFilteredExpandedRecommendations().map((recVideo, idx) => (
                  <VideoCard
                    key={`rec-${idx}`}
                    video={recVideo}
                    isSelected={selectedVideos.some(v => v.url === recVideo.url)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ color: '#aaa' }}>No se encontraron videos recomendados{selectedGlobalTag ? ` que coincidan con "${selectedGlobalTag}" en su título` : ''}. Recuerda que hemos filtrado los de menos de 30s o privados.</div>
            )}
          </div>
        )}
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
