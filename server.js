import axios from 'axios'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { ethers, JsonRpcProvider } from 'ethers'


const app = express()

app.use(cors())
app.use(express.json())

const port = process.env.PORT || 3000
dotenv.config()

const INFURA_URL = process.env.INFURA_URL

const provider = new JsonRpcProvider(INFURA_URL)


// ENS CACHE LOOKUP
const ensCache = new Map();


// GET ENS NAME FROM ADDRESS
async function getENSName(address) {
  if (!address) return null;
  if (ensCache.has(address)) return ensCache.get(address);

  try {
    const ensName = await provider.lookupAddress(address);
    ensCache.set(address, ensName || address);
    return ensName || address;
  } catch (error) {
    console.error('Error resolving ENS name:', error);
    return address;
  }
}

// GET BLOCK BY NUMBER
async function getBlock(blockNumber) {
  const hexBlock = '0x' + blockNumber.toString(16)
  const response = await axios.post(INFURA_URL, {
    jsonrpc: "2.0",
    method: "eth_getBlockByNumber",
    params: [hexBlock, true],
    id: 1
  })
  return response.data.result
}

// GET LATEST BLOCK NUMBER
async function getLatestBlockNumber() {
  const response = await axios.post(INFURA_URL, {
    jsonrpc: "2.0",
    method: "eth_blockNumber",
    params: [],
    id: 1
  })
  return parseInt(response.data.result, 16)
}

// GET BALANCE AT BLOCK
async function getBalanceAtBlock(wallet, blockNumber) {
  const hexBlock = '0x' + blockNumber.toString(16)
  const response = await axios.post(INFURA_URL, {
    jsonrpc: "2.0",
    method: "eth_getBalance",
    params: [wallet, hexBlock],
    id: 1
  })
  return ethers.formatEther(response.data.result)
}

// GET BLOCK BY TIMESTAMP
async function findBlockByTimestamp(timestamp) {
  let earliestBlock = 0
  let latestBlock = await getLatestBlockNumber()
  let resultBlock = 0

  while (earliestBlock <= latestBlock) {
    const midBlock = Math.floor((earliestBlock + latestBlock) / 2)
    const block = await getBlock(midBlock)

    if (!block) break

    const blockTimestamp = parseInt(block.timestamp, 16)

    if (blockTimestamp === timestamp) {
      return midBlock
    } else if (blockTimestamp < timestamp) {
      resultBlock = midBlock
      earliestBlock = midBlock + 1
    } else {
      latestBlock = midBlock - 1
    }
  }

  return resultBlock
}

// GET BALANCE AT TIMESTAMP
async function getBalanceAtTimestamp(wallet, timestamp) {
  const blockNumber = await findBlockByTimestamp(timestamp)
  return await getBalanceAtBlock(wallet, blockNumber)
}

// API ENDPOINTS
app.post('/api/transactions', async (req, res) => {
  const { wallet, startBlock } = req.body

  if (!wallet || startBlock == null) {
    return res.status(400).json({ error: "wallet and startBlock are required" })
  }

  try {
    const latestBlock = await getLatestBlockNumber()
    const transactions = []

    for (let i = startBlock; i <= latestBlock; i++) {
      const block = await getBlock(i)
      if (!block || !block.transactions) continue

      for (const t of block.transactions) {
        if (
          t.from?.toLowerCase() === wallet.toLowerCase() ||
          t.to?.toLowerCase() === wallet.toLowerCase()
        ) {
          const fromENS = await getENSName(t.from)
          const toENS = await getENSName(t.to)

          transactions.push({
            blockNumber: parseInt(t.blockNumber, 16),
            hash: t.hash,
            from: fromENS,
            to: toENS,
            value: ethers.formatEther(t.value),
            timestamp: new Date(parseInt(block.timestamp, 16) * 1000).toISOString(),
          })
        }
      }
    }

    res.json(transactions)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/balanceAtTimestamp', async (req, res) => {
  const { wallet, timestamp } = req.body
  if (!wallet || !timestamp) {
    return res.status(400).json({ error: "wallet and timestamp are required" })
  }
  try {
    const balance = await getBalanceAtTimestamp(wallet, Number(timestamp))
    res.json({ balance })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Server error' })
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
