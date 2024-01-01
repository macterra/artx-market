
import { useEffect, useState } from 'react';
import axios from 'axios';

const AgentBadge = ({ agent, xid, fontSize = '1.0em' }) => {

    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchAgent = async () => {
            if (xid) {
                try {
                    const getProfile = await axios.get(`/api/v1/profile/${xid}`);
                    setUser(getProfile.data);
                } catch (error) {
                    console.log(error);
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
        <div style={{ display: 'flex', alignItems: 'center', fontSize: fontSize, marginLeft: '0.5em', marginRight: '0.5em' }}>
            {user.pfp &&
                <img
                    src={user.pfp}
                    alt=""
                    style={{
                        width: '30px',
                        height: '30px',
                        objectFit: 'cover',
                        marginRight: '10px',
                        borderRadius: '50%',
                    }}
                />
            } <a href={`/profile/${user.xid}`} >{user.name}</a>
        </div>
    );
}

export default AgentBadge;
