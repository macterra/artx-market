import sys
import os
import json
import argparse

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
        try:
            if data[1] == 34:  # len of CIDv0
                cid0 = cid.make_cid(0, cid.CIDv0.CODEC, data[2:])
                self.cid = str(cid0)
            elif data[1] == 36:  # len of CIDv1
                cid1 = cid.make_cid(data[2:])
                cid0 = cid1.to_v0()
                self.cid = str(cid0)
        except:
            # print('cid parser fail')
            return False
        
        self.meta = getMeta(self.cid)

        if self.meta and 'xid' in self.meta:
            self.xid = self.meta['xid']

        return self.xid != None

class Authorizer:
    def __init__(self):
        connect = os.environ.get("BTC_CONNECT")
        self.chain = "BTC"
        # print(f"connect={connect}")
        self.blockchain = AuthServiceProxy(connect, timeout=10)
        self.register = False

    def getChain(self):
        return self.chain

    def getBalance(self):
        return self.balance

    def getStake(self):
        return Decimal('0.00001111')

    def getFee(self):
        ret = self.blockchain.estimatesmartfee(3)
        return ret['feerate']

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
                #if auth.isValid:
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

    def authorize(self, cid):
        print(f"authorizing {cid}")
        authAddr = self.blockchain.getnewaddress("auth", "bech32")
        return self.transfer(cid, authAddr)

    def transfer(self, cid, authAddr):
        print(f"transferring {cid} to {authAddr}")
        xid = getXid(cid)

        if not xid:
            print(f"{cid} includes no valid xid")
            return

        print(f"found xid {xid}")

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

        txfeeRate = self.getFee()
        txfee = txfeeRate * 255 / 1000 # expected size of 255 vBytes

        for funtxn in self.funds:
            inputs.append(funtxn)
            print("inputs", funtxn['amount'])
            amount += funtxn['amount']
            if amount > (stake + txfee):
                break

        if amount < (stake + txfee):
            print('not enough funds in account', amount)
            return

        hexdata = encodeCid(cid)
        nulldata = {"data": hexdata}

        changeAddr = self.blockchain.getnewaddress("auth", "bech32")
        change = amount - stake - txfee
        print(f"{change} = {amount} - {stake} - {txfee}")
        outputs = {"data": hexdata, authAddr: str(stake), changeAddr: change}

        rawtxn = self.blockchain.createrawtransaction(inputs, outputs)

        sigtxn = self.blockchain.signrawtransactionwithwallet(rawtxn)
        print('sig', json.dumps(sigtxn, indent=2, cls=Encoder))
        print(len(sigtxn['hex']))

        dectxn = self.blockchain.decoderawtransaction(sigtxn['hex'])
        print('dec', json.dumps(dectxn, indent=2, cls=Encoder))

        txid = self.blockchain.sendrawtransaction(sigtxn['hex'])
        print('txid', txid)

        txnlog = self.read_txnlog()
        txnlog['pending'] = txid
        self.write_txnlog(txnlog)

        return txid

    def read_txnlog(self):
        if os.path.exists('data/txnlog.json'):
            with open("data/txnlog.json", 'r') as json_file:
                txnlog = json.load(json_file)
        else:
            txnlog = {
                "latest": "",
                "pending": ""
            }
        return txnlog

    def write_txnlog(self, txnlog):
        with open('data/txnlog.json', 'w') as json_file:
            json.dump(txnlog, json_file, indent=2)

    def monitor(self):
        txnlog = self.read_txnlog()
        txid = txnlog['pending']
        if txid:
            print(txid)
            tx = self.blockchain.getrawtransaction(txid, 1)
            if 'blockhash' in tx:
                cert = self.certify(tx)
                txnlog['latest'] = cert
                txnlog['pending'] = ""
                self.write_txnlog(txnlog)
                print(f"certified in {cert}")
            else:
                print("still pending...")

    def certify_tx(self, txid):
        tx = self.blockchain.getrawtransaction(txid, 1)
        if 'blockhash' in tx:
            return self.certify(tx)

    def certify(self, tx):
        auth_tx = AuthTx(tx)
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
        prev_xid = uuid.uuid5(artx_ns, prev_txid)

        cert = {
            "xid": str(xid),
            "cid": auth_tx.cid,
            "meta": auth_tx.meta,
            "time": str(utc_iso),
            "prev": str(prev_xid),
            "auth": {
                "blockheight": block_height,
                "blockhash": blockhash,
                "chainid": chainid,
                "tx": tx
            }
        }

        newpath = f"data/certs/{xid}"

        if not os.path.exists(newpath):
            os.makedirs(newpath)

        with open(f"{newpath}/meta.json", 'w') as json_file:
            json.dump(cert, json_file, indent=2, cls=Encoder)

        return str(xid)

def test():
    authorizer = Authorizer()
    fee = authorizer.getFee()
    print("fee", fee)

def balance():
    authorizer = Authorizer()
    authorizer.updateWallet()
    print("staked ", authorizer.staked)
    print("balance", authorizer.balance)

def fund():
    authorizer = Authorizer()
    print(authorizer.getAddress())

def get_cid():
    file_path = "data/meta.json"
    with open(file_path, 'r') as json_file:
        data = json.load(json_file)
    return data['cid']

def peg():
    authorizer = Authorizer()
    authorizer.authorize(get_cid())

def register():
    authorizer = Authorizer()
    authorizer.register = True
    authorizer.authorize(get_cid())

def monitor():
    authorizer = Authorizer()
    authorizer.monitor()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run a function.')
    parser.add_argument('function', type=str, help='The function to run: register, peg, or monitor')

    try:
        args = parser.parse_args()

        if args.function == 'test':
            test()
        elif args.function == 'balance':
            balance()
        elif args.function == 'fund':
            fund()
        elif args.function == 'peg':
            peg()
        elif args.function == 'register':
            register()
        elif args.function == 'monitor':
            monitor()
        else:
            print(f'Unknown function: {args.function}. Please use "register", "peg", or "monitor".')
    except:
        test()
