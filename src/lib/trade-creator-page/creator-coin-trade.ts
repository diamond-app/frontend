import { GlobalVarsService } from "../../app/global-vars.service";
import { BackendApiService, ProfileEntryResponse } from "../../app/backend-api.service";
import { FormControl, Validators } from "@angular/forms";

export class CreatorCoinTrade {
  static BUY_VERB = "Buy";
  static SELL_VERB = "Sell";
  static TRANSFER_VERB = "Transfer";

  static DESO_CURRENCY_STRING = "DeSo";
  static USD_CURRENCY_STRING = "USD";
  static CREATOR_COIN_CURRENCY_STRING = "Creator coin";

  isBuyingCreatorCoin: boolean;

  // buy creator coin data
  desoToSell: number;
  expectedCreatorCoinReturnedNanos: number = 0;
  expectedFounderRewardNanos: number = 0;

  // sell creator coin data
  creatorCoinToSell: number;
  expectedDeSoReturnedNanos: number = 0;

  // ProfileEntry response from server
  creatorProfile: ProfileEntryResponse;
  showSlippageError: boolean;

  // This needs to be stored on creatorCoinTrade so that the fee is persisted if the user
  // goes to the preview screen adn then goes back to the buy/sell screen
  currentFeeForSellNanos: number;

  selectedCurrency: string;

  tradeType: string;

  networkFeeNanos: number = 0;

  // Amount shown in the trade creator form component.
  amount: FormControl;
  transferRecipient: FormControl = new FormControl(null, [Validators.required]);
  showUsernameError: boolean = false;
  showPubKeyError: boolean = false;
  showCannotSendToSelfError: boolean = false;

  // If the user wishes to follow the creator after purchasing their coin
  followCreator: boolean = false;

  constructor(public globalVars: GlobalVarsService) {
    this.clearAllFields();
  }

  tradeVerbString() {
    return this.tradeType;
  }

  defaultCurrency() {
    return this.isBuyingCreatorCoin
      ? CreatorCoinTrade.USD_CURRENCY_STRING
      : CreatorCoinTrade.CREATOR_COIN_CURRENCY_STRING;
  }

  isCreatorCoinTransfer() {
    return this.tradeType === CreatorCoinTrade.TRANSFER_VERB;
  }

  isBuyingOwnCoin(): boolean {
    return (
      this.creatorProfile.PublicKeyBase58Check === this.globalVars.loggedInUser.PublicKeyBase58Check &&
      this.isBuyingCreatorCoin
    );
  }

  creatorCoinCurrencyString() {
    return `${this.creatorProfile.Username} coin`;
  }

  canUserSpecifiyMultipleCurrencies() {
    return Object.keys(this.currencyConstantsToHumanLabel()).length > 1;
  }

  setTradeType(tab: string) {
    this.tradeType = tab;
    this.isBuyingCreatorCoin = this.tradeType === CreatorCoinTrade.BUY_VERB;
  }

  // returns a map like {DeSo: 'DeSo', USD: 'USD', Creator Coin: 'balajis coin'}
  currencyConstantsToHumanLabel() {
    let map = {};
    if (this.isBuyingCreatorCoin) {
      // If buying creator coins, you can specify DeSo and USD
      //
      // You can't specify an amount in creator coin right now. The API endpoint to buy/sell
      // creator coin takes an amount of DeSo to sell. We don't have a DeSo <=> creator
      // coin exchange rate, so we have no way to convert a user-specified amount of creator coin
      // into an amount of DeSo
      //
      // We don't have an exchange rate because the price depends on the amount of
      // creator coin you specify
      map[CreatorCoinTrade.DESO_CURRENCY_STRING] = CreatorCoinTrade.DESO_CURRENCY_STRING;
      map[CreatorCoinTrade.USD_CURRENCY_STRING] = CreatorCoinTrade.USD_CURRENCY_STRING;
    } else {
      // If selling creator coins, you can only specify an amount in creator coin, because
      // we don't have a DeSo <=> creator coin exchange rate
      //
      // USD is the same: we don't have a USD <=> creator coin exchange rate, so we can't convert
      // a USD amount into a creator coin amount
      map[CreatorCoinTrade.CREATOR_COIN_CURRENCY_STRING] = this.creatorCoinCurrencyString();
    }
    return map;
  }

  assetToSellString() {
    return this.isBuyingCreatorCoin ? CreatorCoinTrade.DESO_CURRENCY_STRING : this.creatorCoinCurrencyString();
  }

  assetToSellBalance() {
    if (this.isBuyingCreatorCoin) {
      return this.globalVars.loggedInUser.BalanceNanos / 1e9;
    } else {
      return this._amountOfCreatorCoinYouHold();
    }
  }

  assetToSellBalanceInUsd() {
    return this.assetToSellBalance() * this.usdPriceOfAssetToSell();
  }

  assetToSellAmount() {
    if (this.isBuyingCreatorCoin) {
      return this.desoToSell;
    } else {
      return this.creatorCoinToSell;
    }
  }

  assetToSellCurrency() {
    if (this.isBuyingCreatorCoin) {
      return CreatorCoinTrade.DESO_CURRENCY_STRING;
    } else {
      return CreatorCoinTrade.CREATOR_COIN_CURRENCY_STRING;
    }
  }

  totalCoinsMinted() {
    return ((this.expectedCreatorCoinReturnedNanos || 0) + (this.expectedFounderRewardNanos || 0)) / 1e9;
  }

  _returnedAssetRowLabelPastTense() {
    return this.isBuyingCreatorCoin ? "Bought" : "You received";
  }

  _soldAssetRowLabelPastTense() {
    return this.isBuyingCreatorCoin ? "With" : "Sold";
  }

  _returnedAssetRowLabelPresentTense() {
    return this.isBuyingCreatorCoin ? "Buy" : "You receive";
  }

  _soldAssetRowLabelPresentTense() {
    return this.isBuyingCreatorCoin ? "With" : "You sell";
  }

  returnedAssetRowLabel(tradeHasBeenExecuted) {
    if (tradeHasBeenExecuted) {
      return this._returnedAssetRowLabelPastTense();
    } else {
      return this._returnedAssetRowLabelPresentTense();
    }
  }

  soldAssetRowLabel(tradeHasBeenExecuted) {
    if (tradeHasBeenExecuted) {
      return this._soldAssetRowLabelPastTense();
    } else {
      return this._soldAssetRowLabelPresentTense();
    }
  }

  assetToSellAmountInUsd() {
    return this.assetToSellAmount() * this.usdPriceOfAssetToSell();
  }

  assetReturnedString() {
    return this.isBuyingCreatorCoin ? this.creatorCoinCurrencyString() : CreatorCoinTrade.DESO_CURRENCY_STRING;
  }

  assetReturnedAmount() {
    if (this.isBuyingOwnCoin()) {
      return ((this.expectedCreatorCoinReturnedNanos || 0) + (this.expectedFounderRewardNanos || 0)) / 1e9;
    }
    if (this.isBuyingCreatorCoin) {
      return (this.expectedCreatorCoinReturnedNanos || 0) / 1e9;
    } else {
      return (this.expectedDeSoReturnedNanos || 0) / 1e9;
    }
  }

  assetReturnedAmountInUsd() {
    if (this.isBuyingCreatorCoin) {
      return (this.desoToSell || 0) * this.usdPriceOfDeSo();
    } else {
      return (this.expectedDeSoReturnedNanos / 1e9) * this.usdPriceOfDeSo();
    }
  }

  clearAllFields() {
    // buy creator coin fields
    this.expectedCreatorCoinReturnedNanos = 0;
    this.expectedFounderRewardNanos = 0;
    this.desoToSell = 0;

    // sell creator coin fields
    this.creatorCoinToSell = 0;
    this.expectedDeSoReturnedNanos = 0;

    this.networkFeeNanos = 0;
  }

  operationType() {
    if (this.isBuyingCreatorCoin) {
      return BackendApiService.BUY_CREATOR_COIN_OPERATION_TYPE;
    } else {
      return BackendApiService.SELL_CREATOR_COIN_OPERATION_TYPE;
    }
  }

  _amountOfCreatorCoinYouHold() {
    let balanceEntryResponse = this.globalVars.youHodlMap[this.creatorProfile.PublicKeyBase58Check];

    let balanceNanos = 0;
    if (balanceEntryResponse) {
      balanceNanos = balanceEntryResponse.BalanceNanos || 0;
    }

    return balanceNanos / 1e9;
  }

  getFoundersRewardPercent() {
    if (this.isBuyingCreatorCoin) {
      return this.creatorProfile.CoinEntry.CreatorBasisPoints / 100;
    } else {
      return 0;
    }
  }

  showFounderRewardWarning() {
    return (
      this.creatorProfile.CoinEntry.CreatorBasisPoints >=
      GlobalVarsService.FOUNDER_REWARD_BASIS_POINTS_WARNING_THRESHOLD
    );
  }

  /********************************************************************
   * Price functions
   ********************************************************************/

  // Returns amount in Nanos
  //
  // Note: we haven't QA'd all the cases below. Some cases are not hit in the current
  // product. Use this function with caution.
  convertAmount(inputAmountNanos: number, inputCurrency: string, targetCurrency: string) {
    if (inputCurrency == CreatorCoinTrade.DESO_CURRENCY_STRING) {
      if (targetCurrency == CreatorCoinTrade.DESO_CURRENCY_STRING) {
        return inputAmountNanos;
      } else if (targetCurrency == CreatorCoinTrade.CREATOR_COIN_CURRENCY_STRING) {
        // return inputAmountNanos / this.desoPriceOfCreatorCoin()
        throw `unsupported currency pair: ${inputCurrency} ${targetCurrency}`;
      } else if (targetCurrency == CreatorCoinTrade.USD_CURRENCY_STRING) {
        return inputAmountNanos * this.usdPriceOfDeSo();
      }
    } else if (inputCurrency == CreatorCoinTrade.CREATOR_COIN_CURRENCY_STRING) {
      if (targetCurrency == CreatorCoinTrade.DESO_CURRENCY_STRING) {
        // return inputAmountNanos * this.desoPriceOfCreatorCoin()
        throw `unsupported currency pair: ${inputCurrency} ${targetCurrency}`;
      } else if (targetCurrency == CreatorCoinTrade.CREATOR_COIN_CURRENCY_STRING) {
        return inputAmountNanos;
      } else if (targetCurrency == CreatorCoinTrade.USD_CURRENCY_STRING) {
        throw `unsupported currency pair: ${inputCurrency} ${targetCurrency}`;
      }
    } else if (inputCurrency == CreatorCoinTrade.USD_CURRENCY_STRING) {
      if (targetCurrency == CreatorCoinTrade.DESO_CURRENCY_STRING) {
        return inputAmountNanos / this.usdPriceOfDeSo();
      } else if (targetCurrency == CreatorCoinTrade.CREATOR_COIN_CURRENCY_STRING) {
        throw `unsupported currency pair: ${inputCurrency} ${targetCurrency}`;
      } else if (targetCurrency == CreatorCoinTrade.USD_CURRENCY_STRING) {
        return inputAmountNanos;
      }
    }

    // if we made it here, then one of the currency arguments is unsupported
    throw `unsupported currency pair: ${inputCurrency} ${targetCurrency}`;
  }

  // USD per creator coin
  // 1 creator coin == how much USD?
  usdPriceOfCreatorCoin() {
    let desoPerCoin;
    if (this.isBuyingOwnCoin()) {
      desoPerCoin = this.desoToSell / this.assetReturnedAmount();
    } else if (this.isBuyingCreatorCoin) {
      desoPerCoin = (this.desoToSell * 1e9) / this.expectedCreatorCoinReturnedNanos;
    } else {
      desoPerCoin = this.expectedDeSoReturnedNanos / (this.creatorCoinToSell * 1e9);
    }

    return desoPerCoin * this.usdPriceOfDeSo();
  }

  // USD per DeSo
  // 1 DeSo == how much USD?
  usdPriceOfDeSo() {
    return 1e9 / this.globalVars.nanosPerUSDExchangeRate;
  }

  // DeSo per creator coin
  desoPriceOfCreatorCoin() {
    if (this.isBuyingOwnCoin()) {
      return (
        this.desoToSell / ((this.expectedCreatorCoinReturnedNanos + (this.expectedFounderRewardNanos || 0)) / 1e9)
      );
    }
    if (this.isBuyingCreatorCoin) {
      return this.desoToSell / (this.expectedCreatorCoinReturnedNanos / 1e9);
    } else {
      return this.expectedDeSoReturnedNanos / 1e9 / this.creatorCoinToSell;
    }
  }

  // USD per asset-to-sell
  // 1 asset-to-sell == how much USD?
  usdPriceOfAssetToSell() {
    if (this.isBuyingCreatorCoin) {
      return this.usdPriceOfDeSo();
    } else {
      return this.usdPriceOfCreatorCoin();
    }
  }
}
