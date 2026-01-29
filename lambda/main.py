import json
import os
import urllib.request
import urllib.parse
import base64

def get_token():
    # Get credentials of enviroment variables
    client_id = os.environ.get('SPOTIFY_CLIENT_ID')
    client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')
    
    # MOCK MODE: Return None if keys are missing or default
    if not client_id or not client_secret or client_id == "CHANGE_ME":
        print("MOCK MODE: No valid Spotify keys found.")
        return None

    auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=urllib.parse.urlencode({'grant_type': 'client_credentials'}).encode(),
        headers={'Authorization': f'Basic {auth}'}
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)['access_token']

def handler(event, context):
    # Handle OPTIONS preflight request for CORS
    # Note: Function URL handles CORS automatically, but we still return 200 for OPTIONS
    http_method = event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'body': ''}
    
    try:
        # Get body data from frontend
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        playlist_url = body.get('url')
        
        if not playlist_url:
            return {'statusCode': 400, 'body': json.dumps({'error': 'URL is missing!'})}

        # Get Token (or None for Mock)
        token = get_token()
        
        if token:
            # REAL MODE: Pull playlist songs from Spotify
            playlist_id = playlist_url.split('/')[-1].split('?')[0]
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
                        tracks.append(f"{artist_name} - {track['name']}")
        else:
            # MOCK MODE: Return static data
            print("RETURNING MOCK DATA")
            tracks = [
                "Linkin Park - Numb",
                "Queen - Bohemian Rhapsody",
                "Daft Punk - Get Lucky",
                "The Weeknd - Blinding Lights",
                "Imagine Dragons - Believer"
            ]
        
        # Note: CORS headers are handled by Function URL config, not here
        return {
            'statusCode': 200,
            'body': json.dumps(tracks)
        }
    except Exception as e:
        return {
            'statusCode': 500, 
            'body': json.dumps({'error': str(e)})
        }