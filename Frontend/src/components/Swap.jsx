import React, { useEffect, useState } from 'react'
import { Input, Popover, Radio, Modal, message } from "antd"
import { ArrowDownOutlined, DownOutlined, SettingOutlined } from "@ant-design/icons"
import TokenList from "../tokenList.json"
import axios from "axios";
import { useSendTransaction, useWaitForTransaction } from "wagmi"

function Swap({ isConnected, address }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [slippage, setSlippage] = useState(2.5)
  const [tokenOneAmount, setTokenOneAmount] = useState(null)
  const [tokenTwoAmount, setTokenTwoAmount] = useState(null)
  const [tokenOne, setTokenOne] = useState(TokenList[0])
  const [tokenTwo, setTokenTwo] = useState(TokenList[1])
  const [isOpen, setIsOpen] = useState(false)
  const [changeToken, setChangeToken] = useState(1)
  const [prices, setPrices] = useState(null)
  const [txDetails, setTxDetails] = useState({
    to: null,
    data: null,
    value: null
  })

  const { data, sendTransaction } = useSendTransaction({
    request: {
      from: address,
      to: String(txDetails.to),
      data: String(txDetails.data),
      value: String(txDetails.value)
    }
  })

  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  })

  function changeAmount(e) {
    setTokenOneAmount(e.target.value)
    if (e.target.value && prices) {
      setTokenTwoAmount((e.target.value * prices.ratio).toFixed(2))
    } else {
      setTokenTwoAmount(null);
    }
  }

  function handleSlippageChange(e) {
    setSlippage(e.target.value);
  }

  function switchTokens() {
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    const temp = tokenOne;
    setTokenOne(tokenTwo);
    setTokenTwo(temp);
    fetchPrices(tokenOne.address, tokenTwo.address)
  }

  function openModal(asset) {
    setChangeToken(asset);
    setIsOpen(true);
  }

  function modifyToken(i) {
    setPrices(null)
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    if (changeToken === 1) {
      setTokenOne(TokenList[i])
      fetchPrices(TokenList[i].address, tokenTwo.address)
    } else {
      setTokenTwo(TokenList[i])
      fetchPrices(tokenOne.address, TokenList[i].address)
    }
    setIsOpen(false)
  }

  async function fetchPrices(one, two) {
    const res = await axios.get('http://localhost:3001/tokenPrice', {
      params: {
        addressOne: one,
        addressTwo: two
      }
    })
    console.log(res.data);
    setPrices(res.data);
  }

  async function fetchDexSwap() {
    const allowance = await axios.get(`https://api.1inch.io/v5.0/1/approve/allowance?tokenAddress=${tokenOne.address}&walletAddress=${address}`)
    if (allowance.data.allowance === "0") {
      const approve = await axios.get(`https://api.1inch.io/v5.0/1/approve/transaction?tokenAddress=${tokenOne.address}`)
      setTxDetails(approve.data)
      console.log("not approve")
      return
    }
    console.log("make swap")
    const tx = await axios.get(
      `https://api.1inch.io/v5.0/1/swap?fromTokenAddress=${tokenOne.address}&toTokenAddress=${tokenTwo.address}&amount=${tokenOneAmount.padEnd(tokenOne.decimals + tokenOneAmount.length, '0')}&fromAddress=${address}&slippage=${slippage}`
    )
    let decimals = Number(`1E${tokenTwo.decimals}`)
    setTokenTwoAmount((Number(tx.data.toTokenAmount) / decimals).toFixed(2));
    setTxDetails(tx.data.tx)
  }

  useEffect(() => {
    fetchPrices(TokenList[0].address, TokenList[1].address)
  }, [])

  useEffect(() => {
    if (txDetails.to && isConnected) {
      sendTransaction();
    }
  }, [txDetails])



  useEffect(() => {
    messageApi.destroy();
    if (isLoading) {
      messageApi.open({
        type: 'loading',
        content: 'Transaction is Pending...',
        duration: 0,
      })
    }
  }, [isLoading])

  useEffect(() => {
    messageApi.destroy();
    if (isSuccess) {
      messageApi.open({
        type: 'success',
        content: 'Transaction Successful',
        duration: 1.5,
      })
    } else if (txDetails.to) {
      messageApi.open({
        type: 'error',
        content: 'Transaction Failed',
        duration: 1.50,
      })
    }
  }, [isSuccess])

  const setting = (
    <>
      <div>Slippage Tolerance</div>
      <div>
        <Radio.Group value={slippage} onChange={handleSlippageChange}>
          <Radio.Button value={0.5}>0.5%</Radio.Button>
          <Radio.Button value={2.5}>2.5%</Radio.Button>
          <Radio.Button value={5}>5.0%</Radio.Button>
        </Radio.Group>
      </div>
    </>
  );
  return (
    <>
      {contextHolder}
      <Modal
        open={isOpen}
        footer={null}
        onCancel={() => setIsOpen(false)}
        title="Select a token"
      >
        <div className="modelContent">
          {
            TokenList?.map((e, i) => {
              return (
                <div className="tokenChoice"
                  key={i}
                  onClick={() => modifyToken(i)}
                >
                  <img src={e.img} alt={e.ticker} className="tokenLogo" />
                  <div className="tokenChoiceNames">
                    <div className="tokenName">{e.name}</div>
                    <div className="tokenTicker">{e.ticker}</div>
                  </div>
                </div>
              )
            })
          }
        </div>
      </Modal>
      <div className='tradeBox'>
        <div className="tradeBoxHeader">
          <h4>Swap</h4>
          <Popover content={setting} title="Settings" trigger='click' placement={'bottomRight'}>
            <SettingOutlined className='cog' />
          </Popover>
        </div>
        <div className="inputs">
          <Input placeholder='0' value={tokenOneAmount} onChange={changeAmount} disabled={!prices}></Input>
          <Input placeholder='0' value={tokenTwoAmount} disabled={true}></Input>
          <div className="switchButton" onClick={switchTokens}>
            <ArrowDownOutlined className='switchArrow' />
          </div>
          <div className="assetOne" onClick={() => openModal(1)}>
            <img src={tokenOne.img} alt='assetOneLogo' className="assetLogo" />
            {tokenOne.ticker}
            <DownOutlined />
          </div>
          <div className="assetTwo" onClick={() => openModal(1)}>
            <img src={tokenTwo.img} alt='assetOneLogo' className="assetLogo" />
            {tokenTwo.ticker}
            <DownOutlined />
          </div>
        </div>
        <div className='swapButton' disabled={!tokenOneAmount} onClick={fetchDexSwap}>Swap</div>
      </div >
    </>
  )
}

export default Swap