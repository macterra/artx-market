import time
import os
from flask import Flask, jsonify, request
import ipfshttpclient
from ipfshttpclient.exceptions import Error as IPFSError
from git import Repo
from git.exc import GitCommandError

app = Flask(__name__)
repo = Repo('data')

try:
    repo.init()
except GitCommandError as error:
    print(f"git error {str(error)}")

def getIpfs():
    connect = os.environ.get('IPFS_CONNECT')

    if connect:
        return ipfshttpclient.connect(connect, timeout=20)
    else:
        return ipfshttpclient.connect(timeout=20)

def checkIpfs():
    for i in range(10):
        try:
            ipfs = getIpfs()
            #print(ipfs.id())
            return True
        except:
            print(i, "attempting to connect to IPFS...")
            time.sleep(1)
    return False

@app.route('/api/v1/pin/', methods=['POST'])
def pin():
    try:
        data = request.get_json()

        if not data or 'path' not in data:
            print("Failed to pin data: No path provided")
            return jsonify({'error': 'No path provided'}), 400

        if checkIpfs():
            ipfs = getIpfs()
            res = ipfs.add(data['path'], recursive=True, pin=True, pattern="**")
            cid = res[-1]['Hash']
        else:
            print("IPFS not available")
            return jsonify({'error': 'IPFS not available', 'cid': 'TBD'}), 500
    except IPFSError as error:
        print(f"Failed to pin data {data['path']}: {str(error)}")
        return jsonify({'error': f"Failed to pin data: {str(error)}", 'cid': 'TBD'}), 500

    print(f"pinned {data['path']} to {cid}")
    return jsonify({'cid': cid})

@app.route('/api/v1/commit', methods=['POST'])
def commit():
    data = request.get_json()

    if not data or 'message' not in data:
        return jsonify({'error': 'No message provided'}), 400

    message = data['message']

    try:
        repo.git.add('--all')
        repo.git.commit('-m', message)
        githash = repo.git.rev_parse('HEAD')
    except GitCommandError as error:
        return jsonify({'error': f'Failed to commit changes: {str(error)}'}), 500

    # Replace this with your actual implementation
    return jsonify({'ok':1, 'githash':githash})

@app.route('/api/v1/peg', methods=['GET', 'POST'])
def peg():
    # Replace this with your actual implementation
    return jsonify({'message': 'You reached the /api/v1/peg endpoint'})

if __name__ == '__main__':
    port = int(os.getenv('ARC_PORT', 5115))
    app.run(debug=True, host='0.0.0.0', port=port)
