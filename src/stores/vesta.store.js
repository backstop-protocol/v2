/**
 * @format
 */
import { makeAutoObservable, runInAction } from "mobx"
import {getPools} from "../lib/vesta/config"
import * as Interface from "../lib/vesta/interface"
import userStore from "./user.store"
import { ApiAction } from "../lib/ApiHelper"
import Web3 from "web3"
const {toBN} = Web3.utils

export const stringToFixed = (string, numbersAfterTheDeciamlPoint) => {
  const decimalPointIndex = string.indexOf(".")
  if(decimalPointIndex === -1){
      return string
  }
  return string.slice(0, decimalPointIndex + numbersAfterTheDeciamlPoint)
}

const reallyLargeAllowance = toBN("8888888888888888888888888888888888888888888888888888888888888888", 16)
const wait = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000))
let vestaStore;

class PoolStore {
  totalEth = "0"
  totalToken = "0"
  tvl = "0"
  amount = "0"
  apr = "0"
  walletBalance = "0"
  footerIsOpen = false
  action = "Deposit"
  txInProgress = false
  hash = null
  val = ""
  err = ""
  success = ""
  inputIsValid = null
  inputErrMsg = ""
  asset = ""
  decimals = null
  allowanceInProgress = null
  allowance = null
  userShareInUsd = "0"
  collaterals = []
  collateralRatio = null
  usdRatio = null 
  reward = null

  get collPercnet(){
    return this.collateralRatio ? (parseFloat(this.collateralRatio) * 100).toFixed(2) : "0.00"
  }

  get usdPercnet(){
    return this.usdRatio ? (parseFloat(this.usdRatio) * 100).toFixed(2) : "0.00"
  }

  get inputIsInvalid() {
    return this.inputIsValid === false ? true : undefined;
  }

  get hasAllowance() {
    if(!this.allowance) return false
    return toBN(this.allowance).gte(reallyLargeAllowance)
  }

  get withdrawValues() {
    if(this.inputIsValid && parseFloat(this.val) > 0 ){
      return {
        usd: (parseFloat(this.val) * parseFloat(this.usdRatio)).toString(),
        coll: (parseFloat(this.val) * parseFloat(this.collateralRatio)).toString()
      }
    } else {
      return {
        usd: "0",
        coll: "0"
      }
    }
  }

  openFooter = (action) => {
    this.action = action
    this.footerIsOpen = true
  }

  closeFooter = () => {
    this.footerIsOpen = false
  }

  validateInput = (input) => {
    if(isNaN(input) || parseFloat(input) <= 0){
      this.inputIsValid = false
      this.inputErrMsg = `${this.action} amount must be positive`
      return
    }

    if(this.action === "Deposit") {
      if(parseFloat(input) > parseFloat(this.walletBalance)){
        this.inputIsValid = false
        this.inputErrMsg = "Insufficient wallet balance"
        return
      }

      if(parseFloat(input) > parseFloat(this.humanAllowance)) {
        this.inputIsValid = false
        this.inputErrMsg = "Insufficient allowance, unlock to grant allowance"
        return
      }
    }

    if(this.action === "Withdraw") {
      if(parseFloat(input) > parseFloat(this.userShareInUsd)){
        this.inputIsValid = false
        this.inputErrMsg = `${this.action} amount is greater than balance`
        return
      }
    }

    this.inputIsValid = true
    this.inputErrMsg = ""
    return
  }

  onInputChange = e => {
    this.val = e.target.value;
    this.validateInput(this.val)
  }

  onHash = txHash => {
    this.hash = txHash
  }

  reset = () => {
    this.txInProgress = false
    this.success = ""
    this.err = ""
    this.hash = null
    this.val = 0
    this.footerIsOpen = false
  } 

  grantAllowance = async (e) => {
    try{
      e.preventDefault()
      runInAction(()=> {
        this.allowanceInProgress = true
      })
      const {web3, user} = userStore
      const context = this.getContext()
      const tx = Interface.grantAllowance(context)
      await ApiAction(tx, user, web3, 0, ()=>{})
      await this.fetchData()
      this.validateInput(this.val)
    } catch(err) {
      console.error(err)
    } finally {
      this.allowanceInProgress = false
    }
  }

  deposit = async amount => {
    try{
      if(!this.inputIsValid){
        return
      }
      runInAction(()=> {
        this.txInProgress = true
      })
      const {web3, user} = userStore
      const context = this.getContext()
      const tx = Interface.deposit(context, amount)
      await ApiAction(tx, user, web3, 0, this.onHash)
      runInAction(()=> {
        this.success = true
      })
    }catch (err) {
      console.error(err)
      runInAction(()=> {
        this.err = err
      })
    }finally{
      const [updateUi,] = await Promise.all([
        this.fetchData(true),
        wait(5)
      ])
      updateUi()
      if(vestaStore){
        vestaStore.refreshStores(this.config.poolAddress)
      }
      this.reset()
    }
  }

  withdraw = async amount => {
    try{
      if(!this.inputIsValid){
        return
      }
      runInAction(()=> {
        this.txInProgress = true
      })
      const {web3, user} = userStore
      const context = this.getContext()
      const amountInShare = await Interface.usdToShare(context, amount)
      const tx = Interface.withdraw(context, amountInShare)
      await ApiAction(tx, user, web3, 0, this.onHash)
      runInAction(()=> {
        this.success = true
      })
    }catch (err) {
      console.error(err)
      runInAction(()=> {
        this.err = err
      })
    }finally{
      const [updateUi,] = await Promise.all([
        this.fetchData(true),
        wait(5)
      ])
      updateUi()
      if(vestaStore){
        vestaStore.refreshStores(this.config.poolAddress)
      }
      this.reset()
    }
  }

  claimReward = async () => {
    try{
      runInAction(()=> {
        this.txInProgress = true
      })
      const {web3, user} = userStore
      const amountInShare = "0"
      const context = this.getContext()
      const tx = Interface.withdraw(context, amountInShare)
      await ApiAction(tx, user, web3, 0, this.onHash)
      runInAction(()=> {
        this.success = true
      })
    }catch (err) {
      console.error(err)
      runInAction(()=> {
        this.err = err
      })
    }finally{
      const [updateUi,] = await Promise.all([
        this.fetchData(true),
        wait(5)
      ])
      updateUi()
      if(vestaStore){
        vestaStore.refreshStores(this.config.poolAddress)
      }
      this.reset()
    }
  }

  constructor(config) {
    this.config = config
    this.asset = config.tokenName
    makeAutoObservable(this)
  }

  init = () => {
    return this.fetchData()
  }

  getContext = () => {
    const {web3, user, chain} = userStore
    return {
      web3, user, chain, ...this.config
    }
  }

  fetchData = async (updateFn) => {
    try{
      const context = this.getContext()
      this.decimals = this.config.decimals
      const aprPromise = Interface.getApr(context)
        .catch(err => console.error(`failed to fetch APR: ${err.message} @ ${err.stack}`)) // will not block
      const tvlPromise = Interface.getTvl(context)
      const walletBalancePromise = Interface.getWalletBallance(context)
      const poolBalancePromise = Interface.getPoolBallance(context)
      const allowancePromise = Interface.getAllowance(context)
      const userShareInUsdPromise = Interface.getUserShareInUsd(context)
      const collateralsPromise = Interface.getCollaterals(context)
      const rewardPromise = Interface.getReward(context)
      // fetching in  parallel
      const [walletBalance, { eth, token }, {tvl, usdRatio, collRatio}, allowance, userShareInUsd, collaterals, reward, apr] = await Promise.all([
        walletBalancePromise, 
        poolBalancePromise,
        tvlPromise,
        allowancePromise,
        userShareInUsdPromise,
        collateralsPromise,
        rewardPromise,
        aprPromise
      ])
      
      const uiUpdate = () => {
        runInAction(()=> {
          this.walletBalance = stringToFixed(Interface.normlize(walletBalance, this.decimals), 5)
          this.tvl = Interface.normlize(tvl, this.decimals)
          this.allowance = allowance
          this.humanAllowance = stringToFixed(Interface.normlize(allowance, this.decimals), 5)
          this.userShareInUsd = stringToFixed(Interface.normlize(userShareInUsd, this.decimals), 5)
          this.collateralRatio = collRatio
          this.usdRatio = usdRatio
          this.collaterals.replace(collaterals)
          this.reward = reward
          this.apr = apr
        })
      }
      if (updateFn === true){
        return uiUpdate
      }
      uiUpdate()
    }catch (err) {
      console.error(`fetchData: ${err.message} @: ${err.stack}`)
    }
  }

}

class VestaStore {
  stabilityPools = []
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  refreshStores = async (excludedPoolAddress) => {
    for (const pool of this.stabilityPools){
      if(pool.config && pool.config.poolAddress === excludedPoolAddress) {
        continue
      }
      await pool.fetchData()
    }
  }

  onUserConnect = async () => {
    this.loading = true
    const {chain} = userStore
    const pools = []
    for (const pool of getPools(chain)){
      const store = new PoolStore(pool)
      await store.init()
      pools.push(store)
    }
    runInAction(()=> {
      this.stabilityPools.replace(pools)
      this.loading = false
    })
  }
}

vestaStore = new VestaStore()

export default vestaStore 