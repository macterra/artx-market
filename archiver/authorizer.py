import sys
import os
import json
import argparse
import base58

from datetime import datetime
from dateutil import tz
from decimal import Decimal
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
from xidb import *


class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)


class AuthTx():
    def __init__(self, tx):
        self.tx = tx
        self.cid = None
        self.xid = None
        self.isValid = self.validate()

    def validate(self):
        vout = self.tx['vout'][0]
        scriptPubKey = vout['scriptPubKey']
        script_type = scriptPubKey['type']
        if script_type != 'nulldata':
            return False
        hexdata = scriptPubKey['hex']
        data = bytes.fromhex(hexdata)
        if data[0] != 0x6a:
            return False
        if data[1] != 70:
            return False
        try:
            op_return = data[2:].decode()
            self.cid, xid58 = op_return.split('::')
            xid_bytes = base58.b58decode(xid58)
            self.xid = str(uuid.UUID(bytes=xid_bytes))
            self.op_return = op_return
            print('hey!', op_return, xid58, self.xid)
            return True
        except:
            return False

class Authorizer:
    def __init__(self):
        connect = os.environ.get("BTC_CONNECT")
        self.chain = "BTC"
        print(f"connect={connect}")
        self.blockchain = AuthServiceProxy(connect, timeout=10)
        self.register = False

    def getChain(self):
        return self.chain

    def getBalance(self):
        return self.balance

    def getStake(self):
        return Decimal('0.00001111')

    def getFee(self, blocks):
        ret = self.blockchain.estimatesmartfee(blocks)
        return ret['feerate']

    def getWalletinfo(self):
        return self.blockchain.getwalletinfo()

    def updateWallet(self):
        self.staked = 0
        self.balance = 0

        # self.blockchain.loadwallet("metatron")
        unspent = self.blockchain.listunspent()
        # print(unspent)
        funds = []
        assets = []

        for tx in unspent:
            if tx['vout'] == 1:
                txin = self.blockchain.getrawtransaction(tx['txid'], 1)
                auth = AuthTx(txin)
                if auth.cid:
                    # if auth.isValid:
                    auth.utxo = tx
                    assets.append(auth)
                    self.staked += tx['amount']
                else:
                    funds.append(tx)
                    self.balance += tx['amount']
            else:
                funds.append(tx)
                self.balance += tx['amount']

        self.funds = funds
        self.assets = assets

    def getAddress(self):
        return self.blockchain.getnewaddress("recv", "bech32")

    def notarize(self, xid, cid):
        authAddr = self.blockchain.getnewaddress("auth")
        print(f"notarize {xid} {cid}")

        self.updateWallet()

        inputs = []

        amount = Decimal('0')
        stake = self.getStake()

        for asset in self.assets:
            if xid == asset.xid:
                if cid == asset.cid:
                    print(f"xid is already up to date with {cid}")
                    return
                inputs.append(asset.utxo)
                amount += stake
                break

        if inputs:
            if self.register:
                print(f"already registered xid {xid}")
                return
            else:
                print(f"found utxo for {xid}")
        else:
            if self.register:
                print(f"registering xid {xid}")
            else:
                print(f"can't find utxo for {xid}")
                return
            
        txfeeRate = self.getFee(3)
        txfee = txfeeRate * 255 / 1000  # expected size of 255 vBytes

        for funtxn in self.funds:
            inputs.append(funtxn)
            print("inputs", funtxn['amount'])
            amount += funtxn['amount']
            if amount > (stake + txfee):
                break

        if amount < (stake + txfee):
            print('not enough funds in account', amount)
            return
        
        print('txfee', txfee)
        
        # Convert the UUID from string format to bytes
        uuid_bytes = uuid.UUID(xid).bytes

        # Encode the bytes in base58
        xid58 = base58.b58encode(uuid_bytes).decode()

        print('xid58', xid58)
        
        # Decode the base58 string into bytes
        uuid_bytes = base58.b58decode(xid58)

        # Convert the bytes back into a UUID
        xid_decoded = uuid.UUID(bytes=uuid_bytes)

        print('xid', xid_decoded)

        version = f'{cid}::{xid58}'

        print('version', version)

        # Convert the string to bytes
        bytes_s = version.encode()

        # Convert the bytes to a hex string
        hexdata = bytes_s.hex()

        print('hexdata', hexdata, len(hexdata))
        
        # changeAddr = self.blockchain.getnewaddress("auth", "bech32")
        # change = amount - stake - txfee
        # print(f"{change} = {amount} - {stake} - {txfee}")
        # outputs = {"data": hexdata, authAddr: str(stake), changeAddr: change}

        # rawtxn = self.blockchain.createrawtransaction(inputs, outputs)

        # sigtxn = self.blockchain.signrawtransactionwithwallet(rawtxn)
        # print('sig', json.dumps(sigtxn, indent=2, cls=Encoder))
        # print(len(sigtxn['hex']))

        # dectxn = self.blockchain.decoderawtransaction(sigtxn['hex'])
        # print('dec', json.dumps(dectxn, indent=2, cls=Encoder))

        # txid = self.blockchain.sendrawtransaction(sigtxn['hex'])
        # print('txid', txid)

        #return txid

    def certify(self, txid):
        tx = self.blockchain.getrawtransaction(txid, 1)

        if 'blockhash' not in tx:
            return
        
        auth_tx = AuthTx(tx)

        if not auth_tx.isValid:
            return
        
        txid = tx['txid']
        blockhash = tx['blockhash']
        block = self.blockchain.getblock(blockhash)
        block_height = block['height']
        block_time = block['time']
        utc = datetime.utcfromtimestamp(block_time).replace(tzinfo=tz.tzutc())
        utc_iso = utc.isoformat(timespec='seconds').replace('+00:00', 'Z')
        tx_index = block['tx'].index(txid)
        chainid = f"urn:chain:BTC:{block_height}:{tx_index}:1"
        artx_ns = uuid.uuid5(uuid.NAMESPACE_DNS, "artx.market")
        xid = uuid.uuid5(artx_ns, txid)

        prev_txid = tx['vin'][0]['txid']        
        prev_tx = self.blockchain.getrawtransaction(prev_txid, 1)
        prev_auth = AuthTx(prev_tx)
        if prev_auth.isValid:
            prev_xid = uuid.uuid5(artx_ns, prev_txid)
        else:
            prev_xid = None

        cert = {
            "xid": str(xid),
            "prev": str(prev_xid),
            "auth": {
                "cid": auth_tx.cid,
                "xid": auth_tx.xid,
                "op_return": auth_tx.op_return,
                "time": str(utc_iso),
                "blockheight": block_height,
                "blockhash": blockhash,
                "chainid": chainid,
                "tx": tx
            }
        }

        print(cert)
        return cert

def run():
    parser = argparse.ArgumentParser(description='Run a function.')
    parser.add_argument('function', type=str,
                        help='The function to run: register, notarize')

    try:
        args = parser.parse_args()
        authorizer = Authorizer()

        if args.function == 'test':
            fee = authorizer.getFee(3)
            print("fee", fee)
        elif args.function == 'wallet':
            walletinfo = authorizer.getWalletinfo()
            print(walletinfo)
        elif args.function == 'balance':
            authorizer.updateWallet()
            print("staked ", authorizer.staked)
            print("balance", authorizer.balance)
        elif args.function == 'fund':
            print(authorizer.getAddress())
        elif args.function == 'register':
            authorizer.register = True
            xid = 'd59d815c-1b23-4de4-a6a9-ed8ca1060184'
            cid = 'QmbNcW8SqNvJ7QuX5zQhQ7fgUtFK8W2gx7GnEgCsPaqGf4'
            authorizer.notarize(xid, cid)
        else:
            print(
                f'Unknown function: {args.function}. Please use "register", "notarize".')
    except Exception as e:
        print(f"An exception occurred: {e}")

        
if __name__ == "__main__":
    
    authorizer = Authorizer()
    
    #authorizer.register = True
    xid = 'd59d815c-1b23-4de4-a6a9-ed8ca1060184'
    #cid = 'QmbNcW8SqNvJ7QuX5zQhQ7fgUtFK8W2gx7GnEgCsPaqGf4'
    cid = 'QmQiqxe6DfgmNj1JTe7Xk2hVQkgEqmMjRy6tuffqcTLJaB'
    authorizer.notarize(xid, cid)

    #txid = '5e7997bc52587b24c7864b3aff8d185a156676117735bd3a7e87aecc42668c8a'
    #cert = authorizer.certify(txid)

