import { useState, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { LANGUAGES } from './i18n';
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
  Link,
  Menu,
  MenuItem,
  ListItemText,
  IconButton,
  Tooltip,
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
      default: '#06060b',
      paper: 'rgba(255, 255, 255, 0.04)',
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

// ── Language Switcher Component ───────────────────────────────────────────────
function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    handleClose();
  };

  return (
    <>
      <Tooltip title={currentLang.label} arrow>
        <IconButton
          id="language-switcher-btn"
          onClick={handleClick}
          sx={{
            fontSize: '1.5rem',
            width: 44,
            height: 44,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              transform: 'scale(1.05)',
            },
          }}
        >
          {currentLang.flag}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              background: 'rgba(20, 20, 30, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              minWidth: 180,
              mt: 1,
            },
          },
        }}
      >
        {LANGUAGES.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            selected={lang.code === i18n.language}
            sx={{
              borderRadius: '8px',
              mx: 0.5,
              my: 0.25,
              gap: 1.5,
              '&.Mui-selected': {
                background: 'rgba(29, 185, 84, 0.15)',
                '&:hover': {
                  background: 'rgba(29, 185, 84, 0.25)',
                },
              },
            }}
          >
            <Box component="span" sx={{ fontSize: '1.3rem' }}>
              {lang.flag}
            </Box>
            <ListItemText primary={lang.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// ── Progress Bar Component ─────────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Box className="progress-container">
      {/* Header row: label left, counter right */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box className="progress-pulse-dot" />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, letterSpacing: '0.03em' }}>
            {t('progress.searchingYouTube')}
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
          {t('progress.complete', { pct })}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
          {t('progress.remaining', { count: total - current })}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const { t } = useTranslation();
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
      setStatus('error:' + t('status.invalidUrl'));
      return;
    }

    setLoading(true);
    setIsStreaming(false);
    setStreamProgress({ current: 0, total: 0 });
    setStatus('loading:' + t('status.analyzingPlaylist'));
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
        setStatus('error:' + t('status.emptyPlaylist'));
        return;
      }

      // Step 2: Open SSE stream to backend
      setStatus('loading:' + t('status.connectingYouTube'));

      const response = await fetch(`${BACKEND_URL}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackList),
      });

      if (!response.ok || !response.body) {
        throw new Error(t('status.backendError', { status: response.status }));
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
            setStatus('success:' + t('status.done', { found, total: payload.total }));
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
      setStatus('error:' + t('status.genericError'));
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

      {/* Floating particles */}
      <div className="particles">
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      {/* Horizontal glow accents */}
      <div className="glow-line glow-line--green" />
      <div className="glow-line glow-line--red" />

      <Container maxWidth="md" sx={{ py: 6, position: 'relative', zIndex: 1 }}>
        {/* Top bar: Logo + Language Switcher */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <div className="logo-container">
            <img src="/logo.png?v=2" alt="Spotify to YouTube Converter" />
          </div>
          <LanguageSwitcher />
        </Box>

        {/* Hero Section */}
        <Box textAlign="center" mb={6}>
          <Typography variant="h3" component="h1" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
            <Box component="span" sx={{ color: '#1db954' }}>{t('hero.spotify')}</Box>
            <Box component="span" sx={{ mx: 2, color: 'text.secondary' }}>{t('hero.arrow')}</Box>
            <Box component="span" sx={{ color: '#ff0000' }}>{t('hero.youtube')}</Box>
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {t('hero.subtitle')}
          </Typography>
        </Box>

        {/* Main Input Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                fullWidth
                variant="outlined"
                placeholder={t('input.placeholder')}
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
                    {t('input.converting')}
                  </>
                ) : (
                  <>
                    {t('input.convertButton')}
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
                <span>🎶</span> {t('table.title')}
              </Typography>
              {rows.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  px: 2,
                  py: 0.5,
                  borderRadius: 4
                }}>
                  {t('table.trackCount', { count: rows.length })}
                </Typography>
              )}
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="10%" sx={{ fontWeight: 'bold' }}>{t('table.headerNumber')}</TableCell>
                    <TableCell width="60%" sx={{ fontWeight: 'bold' }}>{t('table.headerTrackName')}</TableCell>
                    <TableCell width="30%" align="right" sx={{ fontWeight: 'bold' }}>{t('table.headerAction')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                        <Box fontSize="3rem" mb={2} sx={{ opacity: 0.5 }}>🎧</Box>
                        <Typography variant="h6" color="text.primary" gutterBottom>
                          {t('table.emptyTitle')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('table.emptyHint')}
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
                              {t('table.listenButton')}
                            </Button>
                          ) : (
                            <Typography variant="body2" color="error">
                              {row.message || t('table.notFound')}
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
            <Trans i18nKey="footer.madeWith" components={{ heart: <Box component="span" sx={{ color: 'error.main' }} /> }} />
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;