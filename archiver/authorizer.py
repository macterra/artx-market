import os
import json
import argparse
import uuid
import base58

from datetime import datetime
from dateutil import tz
from decimal import Decimal
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
from cid import make_cid

class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return format(float(obj), '.8f')

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
            self.cid, self.xid58 = op_return.split('::')
            xid_bytes = base58.b58decode(self.xid58)
            self.xid = str(uuid.UUID(bytes=xid_bytes))
            self.op_return = op_return
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

        unspent = self.blockchain.listunspent()
        funds = []
        assets = []

        for tx in unspent:
            if tx['vout'] == 1:
                txin = self.blockchain.getrawtransaction(tx['txid'], 1)
                auth = AuthTx(txin)
                if auth.isValid:
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
        return self.blockchain.getnewaddress("recv")

    def notarize(self, xid, cid, limit):
        print(f"notarize {xid} {cid}")

        # Validate xid
        try:
            uuid.UUID(xid)
        except ValueError:
            print(f"{xid} is not a valid xid")
            return

        # Validate cid
        try:
            cid_obj = make_cid(cid)
            if cid_obj.version != 0:
                raise ValueError
        except ValueError:
            print(f"{cid} is not a valid IPFS CID v0")
            return

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

        if limit > 0 and txfee > limit:
            print(f"txfee {txfee} > limit {limit}")
            txfee = Decimal(limit)

        for funtxn in self.funds:
            funtxn["sequence"] = 0xfffffffd # make it RBF
            inputs.append(funtxn)
            print("inputs", funtxn['amount'])
            amount += funtxn['amount']
            if amount > (stake + txfee):
                break

        if amount < (stake + txfee):
            print('not enough funds in account', amount)
            return

        uuid_bytes = uuid.UUID(xid).bytes
        xid58 = base58.b58encode(uuid_bytes).decode()
        op_return = f'{cid}::{xid58}'
        bytes_s = op_return.encode()
        hexdata = bytes_s.hex()

        authAddr = self.blockchain.getnewaddress("auth")
        changeAddr = self.blockchain.getnewaddress("auth")
        change = amount - stake - txfee
        print(f"{change} = {amount} - {stake} - {txfee}")
        outputs = {"data": hexdata, authAddr: str(stake), changeAddr: change}

        rawtxn = self.blockchain.createrawtransaction(inputs, outputs)
        sigtxn = self.blockchain.signrawtransactionwithwallet(rawtxn)
        dectxn = self.blockchain.decoderawtransaction(sigtxn['hex'])
        print('dec', json.dumps(dectxn, indent=2, cls=Encoder))

        txid = self.blockchain.sendrawtransaction(sigtxn['hex'])
        print('txid', txid)
        return txid

    def replaceByFee(self, txid, txnfee):
        tx = self.blockchain.getrawtransaction(txid, 1)

        if 'blockhash' in tx:
            print(f"txn {txid} already confirmed.")
            return

        #print("vin", json.dumps(tx['vin'], indent=2, cls=Encoder))
        #print("vout", json.dumps(tx['vout'], indent=2, cls=Encoder))

        mempool_entry = self.blockchain.getmempoolentry(txid)
        #print("mempool entry", json.dumps(mempool_entry, indent=2, cls=Encoder))

        currentFee = mempool_entry["fee"]

        if txnfee < currentFee:
            print(f"new txnfee {txnfee} < current fee {currentFee}")
            return

        inputs = tx['vin']
        hexdata = tx['vout'][0]['scriptPubKey']['hex']
        stake = tx['vout'][1]['value']
        authAddr = tx['vout'][1]['scriptPubKey']['address']
        change = tx['vout'][2]['value']
        changeAddr = tx['vout'][2]['scriptPubKey']['address']
        newChange = change + currentFee - Decimal(txnfee)

        if newChange < 0:
            self.updateWallet()

            for funtxn in self.funds:
                funtxn["sequence"] = 0xfffffffd # make it RBF
                inputs.append(funtxn)
                print("inputs", funtxn['amount'])
                newChange += funtxn['amount']
                if newChange > 0:
                    break

        # print(f"hexdata {hexdata}")
        # print(f"stake {stake}")
        # print(f"authAddr {authAddr}")
        # print(f"change {change}")
        # print(f"changeAddr {changeAddr}")
        # print(f"current_fee {currentFee}")
        # print(f"newChange {newChange}")

        if newChange < 0:
            print(f"insufficent balance to cover txnfee {txnfee}")
            return;

        outputs = {"data": hexdata, authAddr: stake, changeAddr: newChange}
        # print("outputs", json.dumps(outputs, indent=2, cls=Encoder))

        rawtxn = self.blockchain.createrawtransaction(inputs, outputs)
        sigtxn = self.blockchain.signrawtransactionwithwallet(rawtxn)
        dectxn = self.blockchain.decoderawtransaction(sigtxn['hex'])
        print('dec', json.dumps(dectxn, indent=2, cls=Encoder))

        txid = self.blockchain.sendrawtransaction(sigtxn['hex'])
        print('txid', txid)

        return txid

    def certify(self, txid):
        tx = self.blockchain.getrawtransaction(txid, 1)

        if 'blockhash' not in tx:
            print(f"txn {txid} not yet confirmed.")
            return

        auth_tx = AuthTx(tx)

        if not auth_tx.isValid:
            print(f"txn {txid} not a valid auth txn.")
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
        namespace = uuid.UUID(auth_tx.xid)
        xid = uuid.uuid5(namespace, txid)

        prev_txid = tx['vin'][0]['txid']
        prev_tx = self.blockchain.getrawtransaction(prev_txid, 1)
        prev_auth = AuthTx(prev_tx)
        if prev_auth.isValid and prev_auth.xid == auth_tx.xid:
            prev_xid = uuid.uuid5(namespace, prev_txid)
        else:
            prev_xid = None

        cert = {
            "xid": str(xid),
            "prev": str(prev_xid),
            "auth": {
                "cid": auth_tx.cid,
                "xid": auth_tx.xid,
                "xid58": auth_tx.xid58,
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

    txid = 'ecfe2ada19343a6051c87bf72b07ddf2494cd7e61dc34e18fc96f3c19b5aaacf'
    cert = authorizer.replaceByFee(txid, 0.00027)
