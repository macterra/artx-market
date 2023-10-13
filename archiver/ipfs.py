import os
import time
import ipfshttpclient
from ipfshttpclient.exceptions import Error as IPFSError

def getIpfs():
    connect = os.environ.get('IPFS_CONNECT')
    timeout = int(os.environ.get('IPFS_TIMEOUT', 5))

    print(f"connecting to IPFS {connect} with timeout={timeout}")

    if connect:
        return ipfshttpclient.connect(connect, timeout=timeout)
    else:
        return ipfshttpclient.connect(timeout=timeout)


def checkIpfs():
    for i in range(10):
        try:
            ipfs = getIpfs()
            # print(ipfs.id())
            return True
        except:
            print(i, "attempting to connect to IPFS...")
            time.sleep(1)
    return False
