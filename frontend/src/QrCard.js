import React, { useState, useEffect } from 'react';

const QrCard = ({ invoice, paid, setPaid }) => {

    const [timeLeft, setTimeLeft] = useState(null);
    const [expired, setExpired] = useState(false);

    let timerId;

    useEffect(() => {
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
                    data.payment.checking_id &&
                    //data.payment.checking_id === invoice.checking_id &&
                    data.payment.pending === false) {
                    console.log(`invoice ${data.payment.checking_id} paid!`);
                    setPaid(true);
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
        fontSize: '40px',
        color: '#ffffff',
        textAlign: 'center',
    };

    const textStyle = {
        //marginTop: '4px',
        fontSize: '18px',
        color: '#ffffff',
    };

    return (
        <div>
            <p style={titleStyle}>{invoice.memo}</p>
            <p style={textStyle}>amount: {invoice.amount} sats</p>
            {paid ?
                (
                    <div style={textStyle}>{`invoice paid: ${timeLeft} seconds`}</div>
                ) : expired ? (
                    <div style={textStyle}>{`invoice expired: ${timeLeft} seconds`}</div>
                ) : (
                    <div style={textStyle}>{`expires in: ${timeLeft} seconds`}</div>
                )
            }
            {!expired &&
                <div style={cardStyle}>
                    {paid ?
                        (
                            <div>
                                <div style={imgContainerStyle}>
                                    <img src={'/paid.png'} style={imgStyle} alt={'paid'} />
                                </div>
                            </div>
                        ) : (
                            <a href={invoice.paylink}>
                                <div style={imgContainerStyle}>
                                    <img src={invoice.qrcode} style={imgStyle} alt={invoice.memo} />
                                </div>
                            </a>

                        )}
                </div>
            }
        </div>
    );
};

export default QrCard;
