from flask import Flask, jsonify
import os
import ipfshttpclient

app = Flask(__name__)

def getIpfs():
    connect = os.environ.get('IPFS_CONNECT')

    if connect:
        return ipfshttpclient.connect(connect, timeout=6)
    else:
        return ipfshttpclient.connect(timeout=6)

@app.route('/api/v1/pin/<path:subfolder>', methods=['GET', 'POST'])
def pin(subfolder):
    ipfs = getIpfs()
    folder = f"data/{subfolder}"
    res = ipfs.add(folder, recursive=True)
    for item in res:
        print(item['Name'], item['Hash'])
    cid = res[-1]['Hash']
    res = ipfs.pin.add(cid)
    ipfs.close()
    return jsonify({'ok': 1, 'cid': cid})

@app.route('/api/v1/peg', methods=['GET', 'POST'])
def peg():
    # Replace this with your actual implementation
    return jsonify({'message': 'You reached the /api/v1/peg endpoint'})

if __name__ == '__main__':
    port = int(os.getenv('ARC_PORT', 5115))
    app.run(debug=True, port=port)
