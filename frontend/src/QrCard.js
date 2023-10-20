import React from 'react';

const QrCard = ({ invoice, paid }) => {
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
        fontSize: '14px',
        color: '#ffffff',
    };

    return (
        <div style={cardStyle}>
            {paid ?
                (
                    <div>
                        <p style={titleStyle}>{invoice.memo} ({invoice.amount} sats)</p>
                        <div style={imgContainerStyle}>
                            <img src={'/paid.png'} style={imgStyle} />
                        </div>
                    </div>
                ) : (
                    <a href={invoice.paylink}>
                        <p style={titleStyle}>{invoice.memo} ({invoice.amount} sats)</p>
                        <div style={imgContainerStyle}>
                            <img src={invoice.qrcode} style={imgStyle} />
                        </div>
                    </a>

                )}
        </div>
    );
};

export default QrCard;
