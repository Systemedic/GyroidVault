import sys
import os
import urllib.request
import urllib.parse
from mimetypes import guess_type
import json
import uuid

# Configuration
# Replace these with your actual server URL and API Key
# Alternatively, set them in your environment variables: PV_API_URL and PV_API_KEY
API_URL = os.environ.get('PV_API_URL', 'http://127.0.0.1:3000/api/upload-slicer')
API_KEY = os.environ.get('PV_API_KEY', 'YOUR_API_KEY_HERE')

def upload_file(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found - {file_path}")
        sys.exit(1)

    print(f"Uploading {file_path} to PrintVault...")

    # Build multipart/form-data payload
    boundary = uuid.uuid4().hex
    filename = os.path.basename(file_path)
    mime_type = guess_type(file_path)[0] or 'application/octet-stream'

    with open(file_path, 'rb') as f:
        file_content = f.read()

    data = []
    data.append(f'--{boundary}'.encode('utf-8'))
    data.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode('utf-8'))
    data.append(f'Content-Type: {mime_type}'.encode('utf-8'))
    data.append(b'')
    data.append(file_content)
    data.append(f'--{boundary}--'.encode('utf-8'))
    data.append(b'')

    body = b'\r\n'.join(data)

    req = urllib.request.Request(API_URL, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    req.add_header('Authorization', f'Bearer {API_KEY}')

    try:
        response = urllib.request.urlopen(req)
        response_body = response.read().decode('utf-8')
        if response.status == 201 or response.status == 200:
            print("Successfully uploaded to PrintVault!")
            try:
                res_json = json.loads(response_body)
                print(f"Model ID: {res_json.get('model_id')}")
            except json.JSONDecodeError:
                pass
        else:
            print(f"Failed to upload. Status: {response.status}")
            print(response_body)
            sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Connection failed: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python orcaslicer_upload.py <path_to_gcode>")
        sys.exit(1)
    
    gcode_path = sys.argv[1]
    
    if API_KEY == 'YOUR_API_KEY_HERE':
        print("WARNING: API Key not set. Please set the PV_API_KEY environment variable or edit this script.")
        # We don't exit immediately, let it try if the server has auth disabled for local network, 
        # but PrintVault requires auth.

    upload_file(gcode_path)
