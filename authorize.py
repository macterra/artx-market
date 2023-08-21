import sys
import os
import json

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
            #print('cid parser fail')
            return False
        self.meta = getMeta(self.cid)
        self.xid = getXid(self.cid)
        return self.xid != None


class Authorizer:
    def __init__(self, connect):
        self.chain = "BTC"
        # print(f"connect={connect}")
        self.blockchain = AuthServiceProxy(connect, timeout=10)

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

        for asset in self.assets:
            if asset.meta['xid'] == xid:
                if cid == asset.cid:
                    print(f"xid is already up to date with {cid}")
                    return
                inputs.append(asset.utxo)
                break

        if not inputs:
            print(f"claiming xid {xid}")

        amount = Decimal('0')
        stake = self.getStake()
        txfeeRate = self.getFee()
        txfee = txfeeRate/4

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

        #txid = self.blockchain.sendrawtransaction(sigtxn['hex'])
        #print('txid', txid)
        #return txid


def main():
    connect = os.environ.get("BTC_CONNECT")
    authorizer = Authorizer(connect)
    authorizer.updateWallet()
    balance = authorizer.getBalance()
    print(balance)
    fee = authorizer.getFee()
    print(fee)
    authorizer.authorize("QmYiXRwnynpaY3UenTnXwBK58YCSrUbExjW8bQjbUyw7hD")

    txn = authorizer.blockchain.getrawtransaction("af9e6914fe79f9c41c2a1606dcd6750134d6bec427862ad69865d690ee22eec6", 1)
    print('txn', json.dumps(txn, indent=2, cls=Encoder))
    
if __name__ == "__main__":
    main()
