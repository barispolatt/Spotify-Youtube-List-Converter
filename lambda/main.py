import json
import os
import urllib.request
import urllib.parse
import base64

def get_token():
    # Get credentials of enviroment variables
    client_id = os.environ.get('SPOTIFY_CLIENT_ID')
    client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        raise Exception("Spotify API keys missing!")

    auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=urllib.parse.urlencode({'grant_type': 'client_credentials'}).encode(),
        headers={'Authorization': f'Basic {auth}'}
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)['access_token']

def handler(event, context):
    try:
        # Get body data from frontend
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        playlist_url = body.get('url')
        
        if not playlist_url:
            return {'statusCode': 400, 'body': json.dumps({'error': 'URL is missing!'})}

        # Get ID from URL
        playlist_id = playlist_url.split('/')[-1].split('?')[0]
        token = get_token()
        
        # Pull playlist songs (Limit 50 tracks)
        req = urllib.request.Request(
            f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks?limit=50&fields=items(track(name,artists(name)))",
            headers={'Authorization': f'Bearer {token}'}
        )
        
        tracks = []
        with urllib.request.urlopen(req) as res:
            data = json.load(res)
            for item in data['items']:
                if item.get('track'):
                    track = item['track']
                    artist_name = track['artists'][0]['name'] if track['artists'] else "Unknown"
                    # Add to list in "Artist - Track Name" format
                    tracks.append(f"{artist_name} - {track['name']}")
                
        return {
            'statusCode': 200,
            'body': json.dumps(tracks),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        }
    except Exception as e:
        return {
            'statusCode': 500, 
            'body': json.dumps({'error': str(e)}),
            'headers': {'Access-Control-Allow-Origin': '*'}
        }