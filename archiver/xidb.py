import uuid
import json
import zlib
import cid
import binascii
import shutil

from ipfs import *

def verifyXid(xid):
    try:
        u = uuid.UUID(xid)
        z = zlib.compress(u.bytes)
        if len(z) > len(u.bytes):
            return str(u)
        print(f"invalid {xid} compresses to {len(z)}")
        return None
    except:
        return None

def getXid(cid):
    meta = getMeta(cid)

    if meta and 'xid' in meta:
        return meta['xid']
    
    return None

def getMeta(cid):
    meta = None
    ipfs = getIpfs()

    try:
        meta = json.loads(ipfs.cat(cid + '/meta.json'))
    except:
        pass

    return meta

def getVersions(cid):
    versions = []
    version = getMeta(cid)
    version['auth_cid'] = cid

    while version:
        versions.append(version)
        prev = version['prev']
        if prev:
            version = getMeta(prev)
            version['auth_cid'] = prev
        else:
            version = None

    versions.reverse()
    return versions


def addCert(cert):
    ipfs = getIpfs()
    res = ipfs.add(cert, recursive=True)
    for item in res:
        if item['Name'] == cert:
            return item['Hash']


def pin(cid):
    try:
        ipfs = getIpfs()
        ipfs.get(cid)
        res = ipfs.add(cid, recursive=True)
        shutil.rmtree(cid)
        return True
    except:
        return False


def encodeCid(hash):
    cid1 = cid.make_cid(hash)
    return binascii.hexlify(cid1.to_v1().buffer).decode()
