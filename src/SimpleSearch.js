import React, { useState } from 'react';

const SimpleSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Usar query string para la búsqueda o pasar el payload necesario
      // Ajusta los parámetros según lo que la función /.netlify/functions/videos espere
      const response = await fetch(`/.netlify/functions/videos?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error('Error al buscar videos: ' + response.statusText);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Búsqueda Simple</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Escribe tu búsqueda aquí..."
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      {results && (
        <div>
          <h2>Resultados:</h2>
          <pre style={{
            backgroundColor: '#f4f4f4',
            padding: '15px',
            borderRadius: '4px',
            overflowX: 'auto'
          }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SimpleSearch;
