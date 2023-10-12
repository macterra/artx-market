
import { useEffect, useState } from 'react';

const AgentBadge = ({ agent, xid }) => {

    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchAgent = async () => {
            if (xid) {
                const response = await fetch(`/api/v1/profile/${xid}`);

                if (response.ok) {
                    const user = await response.json();
                    setUser(user);
                }
            }
            else {
                setUser(agent);
            }
        };

        fetchAgent();
    }, [agent, xid]);

    if (!user) {
        return;
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {user.pfp &&
                <img
                    src={user.pfp}
                    alt=""
                    style={{
                        width: '30px',
                        height: '30px',
                        objectFit: 'cover',
                        marginRight: '16px',
                        borderRadius: '50%',
                    }}
                />} <a href={`/profile/${user.xid}`} >{user.name}</a>
        </div>
    );
}

export default AgentBadge;
