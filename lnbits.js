const { requestInvoice } = require('lnurl-pay');
const axios = require('axios');
const config = require('./config');

const checkServer = async () => {
    try {
        const response = await axios.get(`https://${config.ln_host}/api/v1/wallet`, {
            headers: { 'X-API-KEY': config.ln_api_key },
        });

        return response.status === 200;
    } catch (error) {
        console.error(error);
        return false;
    }
};

const createInvoice = async (amount, memo, expiry) => {
    try {
        const data = {
            unit: 'sat',
            internal: false,
            out: false,
            amount: amount,
            memo: memo || `invoice for ${amount} sats`,
            expiry: expiry || 180,
        };

        const getInvoice = await axios.post(`https://${config.ln_host}/api/v1/payments`, data, {
            headers: { 'X-API-KEY': config.ln_api_key },
        });

        const invoiceData = getInvoice.data;

        invoiceData.qrcode = `https://${config.ln_host}/api/v1/qrcode/${invoiceData.payment_request}`;
        invoiceData.paylink = `lightning:${invoiceData.payment_request}`;
        invoiceData.wslink = `wss://${config.ln_host}/api/v1/ws/${config.ln_wallet}`;
        invoiceData.amount = data.amount;
        invoiceData.memo = data.memo;
        invoiceData.expiry = data.expiry;

        console.log(`invoice: ${JSON.stringify(invoiceData, null, 2)}`);

        return invoiceData;
    }
    catch (error) {
        console.log(error);
    }

    return null;
};

const checkPayment = async (payment_hash) => {
    try {
        const getCheck = await axios.get(`https://${config.ln_host}/api/v1/payments/${payment_hash}`, {
            headers: { 'X-API-KEY': config.ln_api_key },
        });

        const check = getCheck.data;
        console.log(`checkPayment: ${JSON.stringify(check, null, 2)}`);
        return check;
    }
    catch (error) {
        console.log(`checkPayment: ${error}`);
    }

    return null;
};

const checkAddress = async (address) => {
    try {
        const getCheck = await axios.get(`https://${config.ln_host}/api/v1/lnurlscan/${address}`, {
            headers: { 'X-API-KEY': config.ln_api_key },
        });

        return getCheck.data;
    }
    catch (error) {
        console.log(error);
    }

    return null;
};

const sendPayment = async (address, amount, comment) => {
    try {
        const scan = await checkAddress(address);

        if (comment.length > scan.commentAllowed) {
            comment = comment.substring(0, scan.commentAllowed);
        }

        const { invoice } = await requestInvoice({
            lnUrlOrAddress: address,
            tokens: amount,
            comment: comment,
        });

        const data = {
            out: true,
            bolt11: invoice,
        };

        const getPayment = await axios.post(`https://${config.ln_host}/api/v1/payments`, data, {
            headers: { 'X-API-KEY': config.ln_admin_key }
        });

        return getPayment.data;
    }
    catch (error) {
        console.log(error);
    }
};

module.exports = {
    checkServer,
    createInvoice,
    checkPayment,
    checkAddress,
    sendPayment,
};
