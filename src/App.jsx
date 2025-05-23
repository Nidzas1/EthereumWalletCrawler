import { useState } from 'react';
import axios from 'axios';
import './App.css';

function WalletTransactions() {
  const [wallet, setWallet] = useState('');
  const [startBlock, setStartBlock] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [balanceDate, setBalanceDate] = useState('');
  const [balanceAtDate, setBalanceAtDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidEthAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
  };

  const fetchTransactions = async () => {
    setError('');
    setBalanceAtDate(null);
    if (!wallet.trim() || !isValidEthAddress(wallet.trim())) {
      setError('Please enter a valid Ethereum wallet address.');
      return;
    }
    if (!startBlock.trim() || isNaN(Number(startBlock)) || Number(startBlock) < 0) {
      setError('Please enter a valid start block number (0 or greater).');
      return;
    }

    setLoading(true);
    setTransactions([]);
    try {
      const res = await axios.post('http://localhost:3000/api/transactions', {
        wallet: wallet.trim(),
        startBlock: Number(startBlock)
      });
      setTransactions(res.data);
      if (res.data.length === 0) {
        setError('No transactions found for this wallet in the given range.');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions. Please try again.');
    }
    setLoading(false);
  };

  const fetchBalanceAtDate = async () => {
    setError('');
    setBalanceAtDate(null);
    if (!wallet.trim() || !isValidEthAddress(wallet.trim())) {
      setError('Please enter a valid Ethereum wallet address.');
      return;
    }
    if (!balanceDate) {
      setError('Please select a valid date.');
      return;
    }

    const timestamp = Math.floor(new Date(balanceDate + 'T00:00:00Z').getTime() / 1000);

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3000/api/balanceAtTimestamp', {
        wallet: wallet.trim(),
        timestamp
      });
      setBalanceAtDate(res.data.balance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <h2>Ethereum Wallet Transactions</h2>

      <input
        type="text"
        placeholder="Wallet Address"
        value={wallet}
        onChange={e => setWallet(e.target.value)}
        disabled={loading}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
      />
      <input
        type="number"
        placeholder="Start Block"
        value={startBlock}
        onChange={e => setStartBlock(e.target.value)}
        disabled={loading}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
        min="0"
      />
      <button
        onClick={fetchTransactions}
        disabled={loading}
        style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 20 }}
      >
        {loading ? 'Loading...' : 'Get Transactions'}
      </button>

      <hr />

      <h3>Get ETH Balance at Specific Date (00:00 UTC)</h3>
      <input
        type="date"

        value={balanceDate}
        onChange={e => setBalanceDate(e.target.value)}
        disabled={loading}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
      />
      <button
        onClick={fetchBalanceAtDate}
        disabled={loading}
        style={{ padding: '10px 20px', marginBottom: 20, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Loading...' : 'Get Balance'}
      </button>

      {balanceAtDate !== null && (
        <p style={{ marginTop: 10 }}>
          ETH balance at {balanceDate} 00:00 UTC: <strong>{balanceAtDate} ETH</strong>
        </p>
      )}

      {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}

      <table id='transactions'>
        {transactions.length > 0 && (
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Value (ETH)</th>
              <th>Block</th>
              <th>Time</th>
              <th>Hash</th>
            </tr>
          </thead>
        )}
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.hash}>
              <td>{tx.from}</td>
              <td>{tx.to}</td>
              <td>{tx.value}</td>
              <td>{tx.blockNumber}</td>
              <td>{tx.timestamp}</td>
              <td>{tx.hash}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ >
  );
}

export default WalletTransactions;