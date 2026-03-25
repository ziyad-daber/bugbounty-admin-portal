'use client'

import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-md">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm text-red-600 hover:text-red-700 font-semibold"
        >
          Disconnect
        </button>
      </div>
    )
  }

  const connector = connectors[0]

  return (
    <button
      onClick={() => connect({ connector })}
      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
    >
      Connect Wallet
    </button>
  )
}
