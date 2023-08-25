import os
import ipfshttpclient
from ipfshttpclient.exceptions import Error as IPFSError

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
            # print(ipfs.id())
            return True
        except:
            print(i, "attempting to connect to IPFS...")
            time.sleep(1)
    return False
