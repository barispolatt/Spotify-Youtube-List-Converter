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

def exchange_code(auth_code, redirect_uri):
    client_id = os.environ.get('SPOTIFY_CLIENT_ID')
    client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')
    
    if not client_id or not client_secret or client_id == "CHANGE_ME":
        return None
        
    auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    data = urllib.parse.urlencode({
        'grant_type': 'authorization_code',
        'code': auth_code,
        'redirect_uri': redirect_uri
    }).encode()
    
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=data,
        headers={
            'Authorization': f'Basic {auth}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    )
    try:
        with urllib.request.urlopen(req) as res:
            return json.load(res)['access_token']
    except urllib.error.HTTPError as e:
        print(f"Token exchange failed: {e.read().decode()}")
        return None
    except Exception as e:
        print(f"Token exchange failed: {str(e)}")
        return None

def handler(event, context):
    # Handle OPTIONS preflight request for CORS
    # Note: Function URL handles CORS automatically, but we still return 200 for OPTIONS
    http_method = event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'body': ''}
        
    # --- HTTPS PROXY FOR SPOTIFY OAUTH ---
    # Spotify requires an HTTPS redirect URI. Since our EC2 frontend is HTTP,
    # we use this Lambda's HTTPS URL as the redirect URI.
    if http_method == 'GET':
        query = event.get('queryStringParameters', {})
        code = query.get('code')
        error = query.get('error')
        
        frontend_url = 'http://3.227.18.154:30081/'
        
        if error:
            return {'statusCode': 302, 'headers': {'Location': f"{frontend_url}?error={error}"}}
            
        if code:
            lambda_url = f"https://{event['requestContext']['domainName']}/"
            token = exchange_code(code, lambda_url)
            
            if token:
                return {'statusCode': 302, 'headers': {'Location': f"{frontend_url}?token={token}"}}
            else:
                return {'statusCode': 302, 'headers': {'Location': f"{frontend_url}?error=auth_failed"}}
        
        # If no code, just return 200 (health check)
        return {'statusCode': 200, 'body': 'Lambda is running!'}
    
    try:
        # Get body data from frontend
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        playlist_url = body.get('url')
        token = body.get('token')
        
        if not playlist_url:
            return {'statusCode': 400, 'body': json.dumps({'error': 'URL is missing!'})}

        # Validate Spotify URL format
        if 'spotify.com/playlist/' not in playlist_url:
            return {'statusCode': 400, 'body': json.dumps({'error': 'Invalid Spotify playlist URL. Please provide a valid playlist link.'})}

        # Use the token passed from frontend, otherwise fallback to Client Credentials/Mock
        if not token:
            token = get_token()
        
        if token:
            # REAL MODE: Pull playlist songs from Spotify
            playlist_id = playlist_url.split('/')[-1].split('?')[0]

            if not playlist_id:
                return {'statusCode': 400, 'body': json.dumps({'error': 'Could not extract playlist ID from URL.'})}

            print(f"ATTEMPTING TO FETCH PLAYLIST ID: {playlist_id}")

            tracks = []
            url = f"https://api.spotify.com/v1/playlists/{playlist_id}/items?limit=100"
            
            while url:
                req = urllib.request.Request(
                    url,
                    headers={'Authorization': f'Bearer {token}'}
                )
                with urllib.request.urlopen(req) as res:
                    data = json.load(res)
                    for list_item in data.get('items', []):
                        # Spotify /tracks uses 'track', /items uses 'item'
                        track_data = list_item.get('track') or list_item.get('item')
                        if track_data and track_data.get('name'):
                            artist_name = track_data['artists'][0]['name'] if track_data.get('artists') else "Unknown"
                            tracks.append(f"{artist_name} - {track_data['name']}")
                    
                    url = data.get('next')
                    
                    # Prevent lambda timeout on massive playlists
                    if len(tracks) > 2000:
                        break
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

        # Handle empty playlists
        if not tracks:
            return {
                'statusCode': 200,
                'body': json.dumps({'error': 'This playlist is empty or contains no playable tracks.'})
            }
        
        # Note: CORS headers are handled by Function URL config, not here
        return {
            'statusCode': 200,
            'body': json.dumps(tracks)
        }
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"Spotify API Error {e.code}: {error_msg}")
        # Parse the JSON if possible
        try:
            error_json = json.loads(error_msg)
            if 'error' in error_json and 'message' in error_json['error']:
                error_msg = error_json['error']['message']
        except:
            pass
        return {
            'statusCode': e.code,
            'body': json.dumps({'error': f"Spotify Error: {error_msg}"})
        }
    except Exception as e:
        import traceback
        print("ERROR IN LAMBDA POST HANDLER:")
        traceback.print_exc()
        return {
            'statusCode': 500, 
            'body': json.dumps({'error': str(e)})
        }