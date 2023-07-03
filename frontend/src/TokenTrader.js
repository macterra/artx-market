import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TableHead,
  Paper,
} from '@mui/material';

const TokenTrader = ({ metadata }) => {
  const [ownedNfts, setOwnedNfts] = useState(0);
  const [unownedNfts, setUnownedNfts] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let response = await fetch(`/api/profile/`);
        const myProfile = await response.json();

        const ownedNfts = [];
        const unownedNfts = [];

        for (const xid of metadata.token.nfts) {
          response = await fetch(`/api/asset/${xid}`);
          const nft = await response.json();
          response = await fetch(`/api/profile/${nft.asset.owner}`);
          nft.owner = await response.json();

          if (nft.asset.owner === myProfile.id) {
            ownedNfts.push(nft);
          }
          else {
            unownedNfts.push(nft);
          }
        }

        setOwnedNfts(ownedNfts);
        setUnownedNfts(unownedNfts);
      } catch (error) {
        console.error('Error fetching asset owner:', error);
      }
    };

    fetchProfile();
  }, [metadata]);

  if (!metadata || !metadata.token) {
    return;
  }

  return (
    <TableContainer>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Title:</TableCell>
            <TableCell>{metadata.asset.title}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Editions:</TableCell>
            <TableCell>{metadata.token.editions > 1 ? metadata.token.editions : "1 of 1"}</TableCell>
          </TableRow>
          {ownedNfts.length > 0 &&
            <TableRow>
              <TableCell>Listings:</TableCell>
              <TableCell>
                <TableContainer component={Paper} style={{ maxHeight: '300px', overflow: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Edition</TableCell>
                        <TableCell>Price</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ownedNfts.map((nft, index) => (
                        <TableRow key={index}>
                          <TableCell>{nft.asset.title}</TableCell>
                          <TableCell>{nft.nft.price}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TableCell>
            </TableRow>
          }
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TokenTrader;
