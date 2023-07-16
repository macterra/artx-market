const { requestInvoice } = require('lnurl-pay');

const createCharge = async (description, amount) => {

    const data = {
        onchainwallet: "",
        lnbitswallet: process.env.SATSPAY_LN_WALLET,
        description: description,
        webhook: "",
        completelink: "",
        completelinktext: "",
        custom_css: "",
        time: 3,
        amount: amount,
        extra: "{\"mempool_endpoint\": \"https://mempool.space\", \"network\": \"Mainnet\"}",
    };

    const response = await fetch(`${process.env.SATSPAY_HOST}/satspay/api/v1/charge`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.SATSPAY_API_KEY,
        },
        body: JSON.stringify(data),
    });

    const chargeData = await response.json();
    chargeData.url = `${process.env.SATSPAY_HOST}/satspay/${chargeData.id}`;

    return chargeData;
};

const checkCharge = async (chargeId) => {

    const response = await fetch(`${process.env.SATSPAY_HOST}/satspay/api/v1/charge/${chargeId}`, {
        method: 'GET',
        headers: {
            'X-API-KEY': process.env.SATSPAY_API_KEY,
        },
    });

    const chargeData = await response.json();

    return chargeData;
};

const sendPayment = async (address, amount, comment) => {
    try {
        const { invoice } = await requestInvoice({
            lnUrlOrAddress: address,
            tokens: amount,
            comment: comment,
        });

        const data = {
            out: true,
            bolt11: invoice,
        };

        const response = await fetch(`${process.env.SATSPAY_HOST}/api/v1/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': process.env.SATSPAY_ADMIN_KEY,
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        return result;
    }
    catch (error) {
        console.log(error);
    }
};

module.exports = {
    createCharge,
    checkCharge,
    sendPayment,
};