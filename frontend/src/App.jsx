import { useState, useRef } from 'react';
import axios from 'axios';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  CircularProgress,
  Stack,
  Link
} from '@mui/material';
import './App.css';

const LAMBDA_URL = import.meta.env.VITE_LAMBDA_URL;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1db954', // Spotify Green
    },
    secondary: {
      main: '#ff0000', // YouTube Red
    },
    background: {
      default: '#0a0a0a',
      paper: 'rgba(255, 255, 255, 0.05)',
    },
  },
  typography: {
    fontFamily: '"Inter", "system-ui", "Avenir", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// ── Progress Bar Component ─────────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Box className="progress-container">
      {/* Header row: label left, counter right */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box className="progress-pulse-dot" />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, letterSpacing: '0.03em' }}>
            Searching YouTube Music
          </Typography>
        </Box>
        <Box className="progress-counter">
          <Typography component="span" sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#1db954' }}>
            {current}
          </Typography>
          <Typography component="span" sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', mx: 0.5 }}>
            /
          </Typography>
          <Typography component="span" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
            {total}
          </Typography>
        </Box>
      </Box>

      {/* Track bar */}
      <Box className="progress-track">
        <Box
          className="progress-fill"
          style={{ width: `${pct}%` }}
        />
        {/* Shimmer overlay — always full-width, clips to fill via parent */}
        <Box className="progress-shimmer" style={{ width: `${pct}%` }} />
      </Box>

      {/* Footer row: percentage left, ETA right */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
          {pct}% complete
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
          {total - current} remaining
        </Typography>
      </Box>
    </Box>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [url, setUrl] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  // SSE progress state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState({ current: 0, total: 0 });
  const readerRef = useRef(null);
  const rowsPerPage = 8;

  // Parse raw SSE text chunks into individual event blocks.
  // A single chunk may contain multiple events separated by "\n\n".
  const parseSseChunk = (text) => {
    const events = [];
    const blocks = text.split('\n\n').filter(Boolean);
    for (const block of blocks) {
      let name = '';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) name = line.slice(6).trim();
        if (line.startsWith('data:')) data = line.slice(5).trim();
      }
      if (name && data) events.push({ name, data });
    }
    return events;
  };

  const handleConvert = async () => {
    if (!url.includes('spotify.com')) {
      setStatus('error:Please enter a valid Spotify playlist URL');
      return;
    }

    setLoading(true);
    setIsStreaming(false);
    setStreamProgress({ current: 0, total: 0 });
    setStatus('loading:Analyzing your Spotify playlist...');
    setRows([]);
    setPage(1);

    try {
      // Step 1: Fetch track list from Lambda
      const spotifyRes = await axios.post(LAMBDA_URL, { url });
      const trackList = spotifyRes.data;

      if (trackList && trackList.error) {
        setStatus(`error:${trackList.error}`);
        return;
      }
      if (!Array.isArray(trackList) || trackList.length === 0) {
        setStatus('error:This playlist appears to be empty. Please try a different playlist.');
        return;
      }

      // Step 2: Open SSE stream to backend
      setStatus('loading:Connecting to YouTube search...');

      const response = await fetch(`${BACKEND_URL}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackList),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Backend returned ${response.status}`);
      }

      setIsStreaming(true);
      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      const collectedRows = [];
      let buffer = '';

      // Step 3: Read the SSE stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Events are separated by double-newline
        const boundary = buffer.lastIndexOf('\n\n');
        if (boundary === -1) continue;

        const completeChunk = buffer.slice(0, boundary + 2);
        buffer = buffer.slice(boundary + 2);

        const events = parseSseChunk(completeChunk);

        for (const { name, data } of events) {
          const payload = JSON.parse(data);

          if (name === 'total') {
            setStreamProgress({ current: 0, total: payload.total });
            setStatus('streaming:');
          }

          if (name === 'track') {
            setStreamProgress({ current: payload.current, total: payload.total });
            collectedRows.push({
              id: payload.current,
              trackName: payload.track,
              youtubeLink: payload.url || null,
              status: payload.status,
              message: payload.message || null,
            });
          }

          if (name === 'done') {
            const found = collectedRows.filter(r => r.status === 'success').length;
            // Sort by original id to maintain playlist order
            collectedRows.sort((a, b) => a.id - b.id);
            setRows(collectedRows);
            setStatus(`success:Done! Found ${found} of ${payload.total} tracks on YouTube Music.`);
            setIsStreaming(false);
          }

          if (name === 'error') {
            setStatus(`error:${payload.message}`);
            setIsStreaming(false);
          }
        }
      }
    } catch (error) {
      console.error(error);
      setStatus('error:Something went wrong. Please try again.');
      setIsStreaming(false);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const paginatedRows = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const getStatusType = () => {
    if (status.startsWith('error:')) return 'error';
    if (status.startsWith('success:')) return 'success';
    if (status.startsWith('loading:') || status.startsWith('streaming:')) return 'info';
    return 'info';
  };

  const getStatusText = () => {
    const text = status.split(':').slice(1).join(':') || status;
    return text;
  };

  const showStatus = status && !status.startsWith('streaming:');
  const showProgress = isStreaming && streamProgress.total > 0;

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="grid-overlay"></div>

      <Container maxWidth="md" sx={{ py: 6, position: 'relative', zIndex: 1 }}>
        {/* Logo Section */}
        <Box display="flex" justifyContent="center" mb={4}>
          <Box
            sx={{
              width: 60,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(29, 185, 84, 0.2) 0%, rgba(255, 0, 0, 0.2) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '2rem',
            }}
          >
            🎵
          </Box>
        </Box>

        {/* Hero Section */}
        <Box textAlign="center" mb={6}>
          <Typography variant="h3" component="h1" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
            <Box component="span" sx={{ color: '#1db954' }}>Spotify</Box>
            <Box component="span" sx={{ mx: 2, color: 'text.secondary' }}>→</Box>
            <Box component="span" sx={{ color: '#ff0000' }}>YouTube</Box>
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Transform your Spotify playlists into YouTube Music in seconds.
            Fast, free, and beautifully simple.
          </Typography>
        </Box>

        {/* Main Input Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Paste your Spotify playlist URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleConvert()}
                InputProps={{
                  startAdornment: <Box component="span" sx={{ mr: 1 }}>🔗</Box>
                }}
              />
              <Button
                id="convert-btn"
                variant="contained"
                color="primary"
                size="large"
                onClick={handleConvert}
                disabled={loading || !url.trim()}
                sx={{
                  minWidth: { xs: '100%', sm: 200 },
                  height: 56,
                  display: 'flex',
                  gap: 1
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={24} color="inherit" />
                    Converting...
                  </>
                ) : (
                  <>
                    Convert Playlist
                    <Box component="span">✨</Box>
                  </>
                )}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* SSE Progress Bar — shown only while streaming */}
        {showProgress && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <ProgressBar current={streamProgress.current} total={streamProgress.total} />
            </CardContent>
          </Card>
        )}

        {/* Status Alert — hidden during active streaming to avoid visual clutter */}
        {showStatus && (
          <Alert
            severity={getStatusType()}
            sx={{ mb: 4, borderRadius: 2, alignItems: 'center' }}
            icon={getStatusType() === 'info' && loading && !isStreaming ? <CircularProgress size={20} /> : undefined}
          >
            {getStatusText()}
          </Alert>
        )}

        {/* Results Section */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h5" component="h2" display="flex" alignItems="center" gap={1}>
                <span>🎶</span> Your Tracks
              </Typography>
              {rows.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  px: 2,
                  py: 0.5,
                  borderRadius: 4
                }}>
                  {rows.length} tracks
                </Typography>
              )}
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="10%" sx={{ fontWeight: 'bold' }}>#</TableCell>
                    <TableCell width="60%" sx={{ fontWeight: 'bold' }}>Track Name</TableCell>
                    <TableCell width="30%" align="right" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                        <Box fontSize="3rem" mb={2} sx={{ opacity: 0.5 }}>🎧</Box>
                        <Typography variant="h6" color="text.primary" gutterBottom>
                          Your converted tracks will appear here
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Paste a Spotify playlist link and click Convert
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell color="text.secondary">{row.id}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{row.trackName}</TableCell>
                        <TableCell align="right">
                          {row.status === "success" && row.youtubeLink ? (
                            <Button
                              component={Link}
                              href={row.youtubeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="outlined"
                              size="small"
                              startIcon={<span>▶</span>}
                              sx={{
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.3)',
                                '&:hover': {
                                  borderColor: 'white',
                                  background: 'rgba(255,255,255,0.1)'
                                }
                              }}
                            >
                              Listen
                            </Button>
                          ) : (
                            <Typography variant="body2" color="error">
                              {row.message || 'Not found'}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {rows.length > rowsPerPage && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <Box textAlign="center" mt={6}>
          <Typography variant="body2" color="text.secondary">
            Built with <Box component="span" color="error.main">♥</Box> for music lovers everywhere
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;