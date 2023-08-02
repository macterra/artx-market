from flask import Flask, jsonify, request
import os
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
        return ipfshttpclient.connect(connect, timeout=6)
    else:
        return ipfshttpclient.connect(timeout=6)

@app.route('/api/v1/pin/<path:subfolder>', methods=['GET', 'POST'])
def pin(subfolder):
    try:
        ipfs = getIpfs()
        folder = f"data/{subfolder}"
        res = ipfs.add(folder, recursive=True)
        cid = res[-1]['Hash']
        res = ipfs.pin.add(cid)
    except IPFSError as error:
        return jsonify({'error': f'Failed to pin data: {str(error)}'}), 500
    finally:
        ipfs.close()

    return jsonify({'ok': 1, 'cid': cid})
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
