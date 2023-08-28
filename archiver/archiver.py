import os
from flask import Flask, jsonify, request
from git import Repo
from git.exc import GitCommandError
from ipfs import *
from datetime import datetime
import authorizer

app = Flask(__name__)
repo = Repo('data')

try:
    repo.init()
except GitCommandError as error:
    print(f"git error {str(error)}")

@app.route('/api/v1/ready', methods=['GET'])
def ready():
    auth = authorizer.Authorizer()
    addr = auth.getAddress()

    # Check if checkIpfs() returns True and getAddress() returns a non-empty string
    ready = checkIpfs() and bool(addr.strip())

    return jsonify({'ready': ready})

@app.route('/api/v1/pin/<path:subfolder>', methods=['GET'])
def pin(subfolder):
    try:
        if not subfolder:
            print("Failed to pin data: No path provided")
            return jsonify({'error': 'No path provided'}), 400

        if checkIpfs():
            ipfs = getIpfs()
            res = ipfs.add(subfolder, recursive=True, pin=True, pattern="**")
            cid = res[-1]['Hash']
        else:
            print("IPFS not available")
            return jsonify({'error': 'IPFS not available', 'cid': 'TBD'}), 500
    except IPFSError as error:
        print(f"Failed to pin data {subfolder}: {str(error)}")
        return jsonify({'error': f"Failed to pin data: {str(error)}", 'cid': 'TBD'}), 500
    except Exception as error:
        print(f"An unexpected error occurred: {str(error)}")
        return jsonify({'error': f"An unexpected error occurred: {str(error)}", 'cid': 'TBD'}), 500

    print(f"pinned {subfolder} to {cid}")
    return jsonify({'path': subfolder, 'cid': cid})

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
        print(f'Failed to commit changes: {str(error)}')
        return jsonify({'error': f'Failed to commit changes: {str(error)}'}), 500

    return jsonify({'ok': 1, 'githash': githash})

@app.route('/api/v1/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or 'cid' not in data:
        return jsonify({'error': 'No cid provided'}), 400

    auth = authorizer.Authorizer()
    auth.register = True
    txid = auth.authorize(data['cid'])

    return jsonify({'txid': txid})

@app.route('/api/v1/peg', methods=['POST'])
def peg():
    data = request.get_json()

    if not data or 'cid' not in data:
        return jsonify({'error': 'No cid provided'}), 400

    auth = authorizer.Authorizer()
    txid = auth.authorize(data['cid'])

    return jsonify({'txid': txid})

@app.route('/api/v1/certify', methods=['POST'])
def certify():
    data = request.get_json()

    if not data or 'txid' not in data:
        return jsonify({'error': 'No txid provided'}), 400

    auth = authorizer.Authorizer()
    xid = auth.certify_tx(data['txid'])

    return jsonify({'xid': xid})

if __name__ == '__main__':
    port = int(os.getenv('ARC_PORT', 5115))
    app.run(debug=True, host='0.0.0.0', port=port)
