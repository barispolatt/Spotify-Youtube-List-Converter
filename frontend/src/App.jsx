import { useState } from 'react';
import axios from 'axios';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, TextField, Typography, Paper, Link } from '@mui/material';

const LAMBDA_URL = "WILL_BE_ADDED"; 
const BACKEND_URL = "http://EC2_PUBLIC_IP:30080/api/v1/youtube/search";

function App() {
  const [url, setUrl] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleConvert = async () => {
    if (!url.includes('spotify.com')) return alert('Invalid Spotify Link');
    
    setLoading(true);
    setStatus('Analyzing Spotify list...');
    setRows([]);

    try {
      // Go to Lambda and get tracklist
      const spotifyRes = await axios.post(LAMBDA_URL, { url });
      const trackList = spotifyRes.data;

      setStatus(`${trackList.length} track found. Searching on Youtube...`);

      // Go to backend and find links 
      const youtubeRes = await axios.post(BACKEND_URL, trackList);

      // Fill the table
      const gridData = youtubeRes.data.map((item, idx) => ({
        id: idx + 1,
        trackName: item.track,
        youtubeLink: item.url
      }));
      setRows(gridData);
      setStatus('İşlem Tamamlandı!');

    } catch (error) {
      console.error(error);
      setStatus('Error occured: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'trackName', headerName: 'Şarkı Adı', width: 300 },
    { 
      field: 'youtubeLink', 
      headerName: 'YouTube Music Linki', 
      width: 400,
      renderCell: (params) => (
        <Link href={params.value} target="_blank" rel="noopener" underline="hover">
          {params.value === "Bulunamadı" ? "Bulunamadı" : "Dinle 🎵"}
        </Link>
      )
    },
  ];

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Spotify ➡️ YouTube Music</Typography>
      
      <Paper sx={{ p: 3, width: '100%', maxWidth: 800, mb: 3, display: 'flex', gap: 2 }}>
        <TextField 
          fullWidth 
          label="Spotify Playlist Linki" 
          variant="outlined" 
          size="small"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button 
          variant="contained" 
          color="error"
          onClick={handleConvert}
          disabled={loading}
        >
          {loading ? 'Çeviriliyor...' : 'Çevir'}
        </Button>
      </Paper>

      <Typography sx={{ mb: 2, color: 'text.secondary' }}>{status}</Typography>

      <Paper sx={{ height: 500, width: '100%', maxWidth: 800 }}>
        <DataGrid 
          rows={rows} 
          columns={columns} 
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Paper>
    </Box>
  );
}

export default App;