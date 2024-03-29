import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const InvoiceView = ({ invoice, title }) => {

    const [timeLeft, setTimeLeft] = useState(0);
    const [expired, setExpired] = useState(false);
    const [paid, setPaid] = useState(false);

    useEffect(() => {
        let timerId;

        if (paid) {
            clearInterval(timerId);
            return;
        }

        let timeLeft = invoice.expiry;
        timerId = setInterval(() => {
            setTimeLeft(timeLeft--);

            if (timeLeft <= 0) {
                clearInterval(timerId);
                setExpired(true);
            }
            if (paid) {
                clearInterval(timerId);
            }
        }, 1000);

        initWebSocket(invoice.wslink);

        // Cleanup
        return () => clearInterval(timerId);
    }, [invoice, paid]);

    function initWebSocket(wslink) {
        const reconnectInterval = 5000;
        const ws = new WebSocket(wslink);

        ws.addEventListener('open', () => {
            console.log(`ws open`);
        });

        ws.addEventListener('close', () => {
            console.log(`ws close`);
            setTimeout(initWebSocket, reconnectInterval);
        });

        ws.addEventListener('error', error => {
            console.log(`ws error: ${error}`)
        });

        ws.addEventListener('message', event => {
            try {
                const data = JSON.parse(event.data);

                console.log(`ws message ${JSON.stringify(data, null, 4)}`);

                if (data.payment &&
                    data.payment.checking_id === invoice.checking_id &&
                    data.payment.pending === false) {
                    console.log(`invoice ${data.payment.checking_id} paid!`);
                    setPaid(true);
                    invoice.paid = true;
                }
                else {
                    console.log(`ws ignoring message`);
                }
            } catch (error) {
                console.log(`error: ${error}`);
            }
        });
    };

    const cardStyle = {
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px',
    };

    const imgContainerStyle = {
        width: '279px',
        height: '279px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        background: 'white',
    };

    const imgStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
    };

    const titleStyle = {
        marginTop: '8px',
        marginBottom: '8px',
        fontSize: '36px',
        color: '#ffffff',
        textAlign: 'center',
    };

    const textStyle = {
        margin: '2px',
        fontSize: '18px',
        color: '#ffffff',
    };

    const linkStyle = {
        margin: '2px',
        fontSize: '12px',
        color: '#ffffff',
    };

    return (
        <div style={{ width: '320px', wordWrap: 'normal' }}>
            <p style={titleStyle}>{title}</p>
            <p style={textStyle}>{invoice.memo} for {invoice.amount} sats</p>
            {paid ?
                (
                    <div style={textStyle}>{`Invoice paid`}</div>
                ) : expired ? (
                    <div style={textStyle}>{`Invoice expired`}</div>
                ) : (
                    <div style={textStyle}>{`Invoice expires in: ${timeLeft} seconds`}</div>
                )
            }
            {!expired && (
                paid ?
                    (
                        <div style={cardStyle}>
                            <div style={imgContainerStyle}>
                                <img src={'/paid.png'} style={imgStyle} alt={'paid'} />
                            </div>
                        </div>
                    ) : (
                        <a href={invoice.paylink}>
                            <div style={linkStyle}>Click or scan this QR code to pay the lightning invoice.</div>
                            <div style={cardStyle}>
                                <div style={imgContainerStyle}>
                                    <QRCodeSVG value={invoice.payment_request} size={256} />
                                </div>
                            </div>
                        </a>
                    )
            )}
        </div>
    )
};

export default InvoiceView;
