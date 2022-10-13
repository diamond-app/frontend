import { environment } from "../../environments/environment";

const cleanErrorMessages = [
  {
    searchString: "RuleErrorFollowEntryAlreadyExists",
    errorMessage: "You already follow this user.",
  },
  {
    searchString: "AddInputsAndChangeToTransaction: Sanity check failed",
    errorMessage: "You do not hold enough $DESO to cover the transaction fees for this action.",
  },
  {
    searchString: "RuleErrorDAOCoinLimitOrderInsufficientDAOCoinsToOpenOrder",
    errorMessage: "You do not hold enough DAO coins to open this order.",
  },
  {
    searchString: "RuleErrorTxnSpendsMoreThanGlobalDESOLimit",
    errorMessage: "This order exceeds the $DESO limit, please make a smaller order and try again.",
  },
  {
    searchString: "CreateDAOCoinLimitOrder: Insufficient balance to open order",
    errorMessage: "You do not hold sufficient $DESO or DAO coins to open this order.",
  },
  {
    searchString: "Buying this DAO coin is restricted to the creator of the DAO.",
    errorMessage: "Buying this DAO coin is restricted to the creator of the DAO.",
  },
  {
    searchString: "is not enough to cover the amount they are selling",
    errorMessage: "You do not hold sufficient $DESO or DAO Coins to open this order.",
  },
  {
    searchString: "Transaction Spending limit object is required",
    errorMessage:
      "This request failed due to a transaction spending limit object not being attached. Please try again.",
  },
  {
    searchString: "CreateDAOCoinLimitOrder: The value 0 is too small to produce a scaled exchange rate",
    errorMessage: "The price provided is too low to create a valid order. Please increase price and try again.",
  },
  {
    searchString: "CreateDAOCoinLimitOrder: ExchangeRateCoinsToSellPerCoinToBuy must be greater than 0",
    errorMessage: "The price provided is too low to create a valid order. Please increase price and try again.",
  },
  {
    searchString: "RuleErrorDAOCoinLimitOrderMatchingOwnOrder",
    errorMessage:
      "This order will match against your own previously opened order. In order to place this order, please set a new limit price or cancel the previous order.",
  },
  {
    searchString: "RuleErrorInputSpendsPreviouslySpentOutput",
    errorMessage: "Error processing transaction. Please try again",
  },
  {
    searchString:
      "CreateDAOCoinMarketOrder: The input quantity 0 produces a value of 0 when scaled to base units nanos",
    errorMessage:
      "The quantity provided is too low to create a valid order. Please enter a non-zero quantity and try again.",
  },
  {
    searchString: "CreateDAOCoinMarketOrder: The input quantity 0 produces a value of 0 when scaled to DESO nanos",
    errorMessage:
      "The DESO amount provided is too low to create a valid order. Please enter a non-zero DESO amount and try again.",
  },
  {
    searchString: "RuleErrorDAOCoinLimitOrderFillOrKillOrderUnfulfilled",
    errorMessage:
      "There is not enough liquidity in the market to fill this order completely. Please set a lower quantity and try again.",
  },
  {
    searchString: "not a valid public address for destination ticker USDC",
    errorMessage: "Please enter a valid USDC address.",
  },
  {
    searchString: "not sufficient",
    errorMessage: "Your balance is insufficient.",
  },
  {
    searchString: "with password",
    errorMessage: "The password you entered was incorrect.",
  },
  {
    searchString: "RuleErrorPrivateMessageSenderPublicKeyEqualsRecipientPublicKey",
    errorMessage: "You can't message yourself.",
  },
  {
    searchString: "Problem decoding recipient",
    errorMessage: "The public key you entered is invalid. Check that you copied it in correctly.",
  },
  {
    searchString: "Problem converting len(msg.TxInputs): EOF",
    errorMessage: "There was a problem validating your transaction. Please log out and log back in to continue.",
  },
  {
    searchString: "token contains an invalid number of segments",
    errorMessage:
      "DeSo identity could not generate a secure jwt token. Your session may have expired and you'll need to log out and log back in. If you are using Brave Browser, this can typically be resolved by disabling shields.",
  },
  {
    searchString: "RuleErrorExistingStakeExceedsMaxAllowed",
    errorMessage: "Another staker staked to this profile right before you. Please try again.",
  },
  {
    searchString: "already has stake",
    errorMessage: "You cannot stake to the same profile more than once.",
  },
  {
    searchString: "RuleErrorProfileUsernameExists",
    errorMessage: "Sorry, someone has already taken this username.",
  },
  {
    searchString: "RuleErrorUserDescriptionLen",
    errorMessage: "Your description is too long.",
  },
  {
    searchString: "RuleErrorProfileUsernameTooLong",
    errorMessage: "Your username is too long.",
  },
  {
    searchString: "RuleErrorInvalidUsername",
    errorMessage:
      "Your username contains invalid characters. Usernames can only numbers, English letters, and underscores.",
  },
  {
    searchString: "RuleErrorCreatorCoinTransferInsufficientCoins",
    errorMessage: "You need more of your own creator coin to give a diamond of this level.",
  },
  {
    searchString: "RuleErrorInputSpendsPreviouslySpentOutput",
    errorMessage: "You're doing that a bit too quickly. Please wait a second or two and try again.",
  },
  {
    searchString: "RuleErrorCreatorCoinTransferBalanceEntryDoesNotExist",
    errorMessage: "You must own this creator coin before transferring it.",
  },
  {
    searchString: "RuleErrorCreatorCoinBuyMustTradeNonZeroDeSoAfterFounderReward",
    errorMessage:
      "This creator has set their founder's reward to 100%. You cannot buy creators that have set their founder's reward to 100%.",
  },
  {
    searchString: "SendDiamonds: Sender and receiver cannot be the same.",
    errorMessage: "You cannot send diamonds to yourself.",
  },
];

// Take the error message, see if it matches to any cleaned error messages, return the clean message if so.
export function parseCleanErrorMsg(errorMsg: string): string {
  for (let ii = 0; ii < cleanErrorMessages.length; ii++) {
    const cleanErrorMsg = cleanErrorMessages[ii];
    if (errorMsg.includes(cleanErrorMsg.searchString)) {
      return cleanErrorMsg.errorMessage;
    }
  }
  return errorMsg;
}
