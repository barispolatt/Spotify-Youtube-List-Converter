import { useState } from 'react';
import axios from 'axios';
import './App.css';

const LAMBDA_URL = import.meta.env.VITE_LAMBDA_URL;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [url, setUrl] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 8;

  const handleConvert = async () => {
    if (!url.includes('spotify.com')) {
      setStatus('error:Please enter a valid Spotify playlist URL');
      return;
    }

    setLoading(true);
    setStatus('loading:Analyzing your Spotify playlist...');
    setRows([]);

    try {
      const spotifyRes = await axios.post(LAMBDA_URL, { url });
      const trackList = spotifyRes.data;

      setStatus(`loading:Found ${trackList.length} tracks. Searching YouTube Music...`);

      const youtubeRes = await axios.post(BACKEND_URL, trackList);

      const gridData = youtubeRes.data.map((item, idx) => ({
        id: idx + 1,
        trackName: item.track,
        youtubeLink: item.url
      }));
      setRows(gridData);
      setStatus(`success:Successfully converted ${gridData.length} tracks!`);
    } catch (error) {
      console.error(error);
      setStatus('error:Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const paginatedRows = rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getStatusType = () => {
    if (status.startsWith('error:')) return 'error';
    if (status.startsWith('success:')) return 'success';
    if (status.startsWith('loading:')) return 'loading';
    return '';
  };

  const getStatusText = () => status.split(':')[1] || status;

  return (
    <>
      {/* Grid overlay for depth */}
      <div className="grid-overlay"></div>

      <div className="app-container">
        {/* Logo & Branding */}
        <div className="logo-section">
          <div className="logo-icon">🎵</div>
        </div>

        {/* Hero Section */}
        <h1 className="hero-title">
          <span className="spotify">Spotify</span>
          <span className="arrow">→</span>
          <span className="youtube">YouTube</span>
        </h1>
        <p className="hero-subtitle">
          Transform your Spotify playlists into YouTube Music in seconds.
          Fast, free, and beautifully simple.
        </p>

        {/* Main Input Card */}
        <div className="main-card">
          <div className="input-wrapper">
            <span className="input-icon">🔗</span>
            <input
              type="text"
              className="url-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste your Spotify playlist URL here..."
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleConvert()}
            />
          </div>
          <button
            className={`convert-btn ${loading ? 'loading' : ''}`}
            onClick={handleConvert}
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Converting...</span>
              </>
            ) : (
              <>
                <span>Convert Playlist</span>
                <span>✨</span>
              </>
            )}
          </button>
        </div>

        {/* Status Badge */}
        {status && (
          <div className={`status-badge ${getStatusType()}`}>
            {getStatusType() === 'loading' && <div className="status-dot"></div>}
            {getStatusType() === 'success' && <span>✓</span>}
            {getStatusType() === 'error' && <span>✕</span>}
            <span className="status-text">{getStatusText()}</span>
          </div>
        )}

        {/* Results Table */}
        <div className="results-card">
          <div className="results-header">
            <h2 className="results-title">
              <span>🎶</span>
              <span>Your Tracks</span>
            </h2>
            {rows.length > 0 && (
              <span className="track-count">{rows.length} tracks</span>
            )}
          </div>

          <div className="results-table">
            <div className="table-row header">
              <span>#</span>
              <span>Track Name</span>
              <span>Action</span>
            </div>

            {paginatedRows.length === 0 ? (
              <div className="table-row empty">
                <div className="empty-state">
                  <div className="icon">🎧</div>
                  <p>Your converted tracks will appear here</p>
                  <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>
                    Paste a Spotify playlist link and click Convert
                  </p>
                </div>
              </div>
            ) : (
              paginatedRows.map((row) => (
                <div className="table-row" key={row.id}>
                  <span className="track-number">{row.id}</span>
                  <span className="track-name">{row.trackName}</span>
                  <span>
                    {row.youtubeLink && row.youtubeLink !== "Bulunamadı" ? (
                      <a
                        href={row.youtubeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="listen-link"
                      >
                        <span>▶</span>
                        <span>Listen</span>
                      </a>
                    ) : (
                      <span className="not-found">Not found</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {rows.length > rowsPerPage && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`page-btn ${page === i ? 'active' : ''}`}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="footer">
          <p className="footer-text">
            Built with <span>♥</span> for music lovers everywhere
          </p>
        </footer>
      </div>
    </>
  );
}

export default App;