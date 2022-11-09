//@ts-strict
import { Component, Input, OnChanges, OnDestroy } from "@angular/core";
import { finalize, first, switchMap, takeWhile } from "rxjs/operators";
import { BackendApiService } from "src/app/backend-api.service";
import { GlobalVarsService } from "src/app/global-vars.service";
import {
  CreateAddrsResponse,
  DestinationAmountForDepositAmount,
  MegaswapService,
  Ticker,
} from "src/app/megaswap.service";

const LAST_USED_ADDRESSES_LOCAL_STORAGE_KEY = "lastUsedMegaswapCashOutAddresses";

const rightPad = (str: string, pad: string, count: number) =>
  str.length < count ? `${str}${pad.repeat(count - str.length)}` : str;

const formatFloat = (floatString: string) => {
  const toFixed = parseFloat(floatString).toFixed(9);
  const [whole, decimal] = toFixed.split(".");
  const decimalWithTrimmedZeros = decimal.replace(/0+$/, "");
  return `${Number(whole).toLocaleString()}.${rightPad(decimalWithTrimmedZeros, "0", 2)}`;
};

@Component({
  selector: "cashout",
  templateUrl: "./cashout.component.html",
  styleUrls: ["./cashout.component.scss"],
})
export class CashoutComponent implements OnDestroy, OnChanges {
  @Input() depositTicker!: "DESO" | "DUSD";
  depositAddresses?: CreateAddrsResponse;
  destinationAmountForDepositAmount?: DestinationAmountForDepositAmount;
  createAddrsErrorMessage = "";
  cashOutErrorMessage = "";
  destinationAddressInputValue = "";
  amountToCashOutInputValue: number | null = 0;
  isLoading = true;
  isPendingCashOut = false;
  isDestroyed = false;
  destinationTicker: Ticker = "USDC";

  get isCashOutButtonDisabled() {
    return (
      typeof this.amountToCashOutInputValue !== "number" ||
      this.amountToCashOutInputValue <= 0 ||
      this.createAddrsErrorMessage.length > 0 ||
      !this.depositAddresses?.DestinationAddress
    );
  }

  get defaultDestinationAddress() {
    return this.depositAddresses?.DestinationAddress ?? "";
  }

  get conversionRate() {
    return formatFloat(this.destinationAmountForDepositAmount?.SwapRateDestinationTickerPerDepositTicker ?? "0");
  }

  get destinationAmount() {
    return formatFloat(this.destinationAmountForDepositAmount?.DestinationAmount ?? "0");
  }

  get feeDeducted() {
    if (
      typeof this.destinationAmountForDepositAmount?.DepositFeeDeducted === "undefined" ||
      Number(this.destinationAmountForDepositAmount.DepositFeeDeducted) === 0
    ) {
      return null;
    }

    if (this.depositTicker === "DESO") {
      const desoFee = parseFloat(this.destinationAmountForDepositAmount.DepositFeeDeducted);
      const usdPerDeso = parseFloat(this.destinationAmountForDepositAmount.SwapRateDestinationTickerPerDepositTicker);
      return formatFloat((desoFee * usdPerDeso).toString());
    }

    if (this.depositTicker === "DUSD") {
      return formatFloat(this.destinationAmountForDepositAmount.DepositFeeDeducted);
    }

    return null;
  }

  get availableBalance() {
    if (!this.globalVars.loggedInUser) return 0;
    if (this.depositTicker === "DESO") {
      return formatFloat((this.globalVars.loggedInUser.BalanceNanos / 1e9).toString());
    }
  }

  get formattedDepositTicker() {
    if (this.depositTicker === "DUSD") return "USD";
    return this.depositTicker;
  }

  constructor(
    private megaswap: MegaswapService,
    private backend: BackendApiService,
    private globalVars: GlobalVarsService
  ) {
    const maybeStoredAddresses = window.localStorage.getItem(LAST_USED_ADDRESSES_LOCAL_STORAGE_KEY);
    if (maybeStoredAddresses) {
      const parsedAddresses = JSON.parse(maybeStoredAddresses);
      if (parsedAddresses.DestinationAddress) {
        this.destinationAddressInputValue = parsedAddresses.DestinationAddress;
        this.depositAddresses = parsedAddresses;
      }
    }
  }

  ngOnChanges() {
    this.getDestinationAmountForDepositAmount(1).subscribe((res) => {
      this.destinationAmountForDepositAmount = {
        ...res,
        DestinationAmount: "0",
      };
    });
  }

  ngOnDestroy() {
    this.isDestroyed = true;
  }

  getDestinationAmountForDepositAmount(depositAmount: number) {
    return this.megaswap
      .getDestinationAmountForDepositAmount(depositAmount.toString(), this.depositTicker, this.destinationTicker)
      .pipe(
        first(),
        takeWhile(() => !this.isDestroyed),
        finalize(() => {
          this.isLoading = false;
        })
      );
  }

  onAmountToCashOutChange() {
    if (typeof this.amountToCashOutInputValue === "number" && this.amountToCashOutInputValue > 0) {
      this.getDestinationAmountForDepositAmount(this.amountToCashOutInputValue).subscribe((res) => {
        this.destinationAmountForDepositAmount = res;
      });
    } else {
      this.getDestinationAmountForDepositAmount(1).subscribe((res) => {
        this.destinationAmountForDepositAmount = {
          ...res,
          DestinationAmount: "0",
        };
      });
    }
  }

  onDestinationAddressChange(ev: Event) {
    this.depositAddresses = undefined;
    this.megaswap
      .createDepositAddresses({
        DestinationAddress: (ev.target as HTMLInputElement).value.trim(),
        DestinationTicker: this.destinationTicker,
      })
      .pipe(
        takeWhile(() => !this.isDestroyed),
        first()
      )
      .subscribe(
        (res) => {
          if (typeof res.DestinationAddress === "undefined") {
            this.createAddrsErrorMessage = `Please enter a valid ${this.destinationTicker} address.`;
          } else {
            this.depositAddresses = res;
            this.createAddrsErrorMessage = "";
          }
        },
        (err) => {
          const megaswapApiErrorMessage = err?.error?.error;
          if (typeof megaswapApiErrorMessage === "string") {
            this.createAddrsErrorMessage = megaswapApiErrorMessage.includes("not a valid public address")
              ? `Please enter a valid ${this.destinationTicker} address.`
              : megaswapApiErrorMessage;
          } else {
            this.createAddrsErrorMessage = "An unexpected network error occurred. Try reloading the page.";
          }
        }
      );
  }

  clickMax() {
    this.amountToCashOutInputValue = this.globalVars.loggedInUser?.BalanceNanos / 1e9;
    this.onAmountToCashOutChange();
  }

  onCashOut() {
    if (!this.depositAddresses?.DestinationAddress) {
      this.cashOutErrorMessage =
        "An unexpected network error occurred. No transfer was executed. Try reloading the page.";
      return;
    }

    // if the user committed to using this destination address, store it in
    // local storage for future use
    window.localStorage.setItem(LAST_USED_ADDRESSES_LOCAL_STORAGE_KEY, JSON.stringify(this.depositAddresses));

    if (typeof this.amountToCashOutInputValue != "number" || this.amountToCashOutInputValue <= 0) {
      this.cashOutErrorMessage = "Please enter a non-zero amount to cash out.";
      return;
    }
    if (Number(this.destinationAmount) <= 0) {
      this.cashOutErrorMessage = "Unable to cash out. You'll receive $0.00 after network fees.";
      return;
    }

    const DepositAddress = this.depositAddresses.DepositAddresses[this.depositTicker];

    this.isPendingCashOut = true;
    this.backend
      .SendDeSo(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.depositAddresses.DepositAddresses[this.depositTicker],
        this.amountToCashOutInputValue * 1e9,
        this.globalVars.feeRateDeSoPerKB * 1e9
      )
      .pipe(
        switchMap(() => this.megaswap.pollNewDeposits({ DepositTicker: this.depositTicker, DepositAddress })),
        switchMap((confirmedDeposit) =>
          this.megaswap.pollConfirmedDeposit(confirmedDeposit.DepositTxId, {
            DepositTicker: this.depositTicker,
            DepositAddress,
          })
        ),
        first(),
        takeWhile(() => !this.isDestroyed)
      )
      .subscribe(
        (res) => {
          console.log("confirmed transfer!!", res);
        },
        (err) => {}
      );
  }
}
