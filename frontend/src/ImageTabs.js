import { Tabs, Tab } from '@mui/material';

const ImageTabs = ({ navigate, xid, index }) => {

    const handleTabChange = (event, newIndex) => {
        switch (newIndex) {
            case 0:
                navigate(`/image/${xid}`);
                break;
            case 1:
                navigate(`/image/edit/${xid}`);
                break;
            case 2:
                navigate(`/nft/${xid}`);
                break;
            default:
                break;
        }
    };

    return (
        <Tabs
            value={index}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
        >
            <Tab key={0} label={'Metadata'} />
            <Tab key={1} label={'Edit'} />
            <Tab key={2} label={'NFT'} />
        </Tabs>
    );
};

export default ImageTabs;
