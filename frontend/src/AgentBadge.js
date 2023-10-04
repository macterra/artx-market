
const AgentBadge = ({ agent }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {agent.pfp &&
                <img
                    src={agent.pfp}
                    alt=""
                    style={{
                        width: '30px',
                        height: '30px',
                        objectFit: 'cover',
                        marginRight: '16px',
                        borderRadius: '50%',
                    }}
                />} <a href={`/profile/${agent.xid}`} >{agent.name}</a>
        </div>
    );
}

export default AgentBadge;
