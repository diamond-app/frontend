//@ts-strict
import { Component, Input, OnChanges, OnDestroy } from "@angular/core";
import { finalize, first, switchMap, takeWhile } from "rxjs/operators";
import { BackendApiService } from "src/app/backend-api.service";
import { GlobalVarsService } from "src/app/global-vars.service";
import {
  CreateAddrsResponse,
  DepositEvent,
  DestinationAmountForDepositAmount,
  MegaswapService,
  Ticker,
} from "src/app/megaswap.service";

const LAST_USED_ADDRESSES_LOCAL_STORAGE_KEY = "lastUsedMegaswapCashOutAddresses";

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
  cashOutAmountErrorMessage = "";
  destinationAddressInputValue = "";
  amountToCashOutInputValue: number | null = 0;
  isLoading = true;
  isPendingCashOut = false;
  isDestroyed = false;
  destinationTicker: Ticker = "USDC";
  cashOutHistory?: DepositEvent[];
  isRefreshingHistory: boolean = false;

  get isCashOutButtonDisabled() {
    return (
      typeof this.amountToCashOutInputValue !== "number" ||
      this.amountToCashOutInputValue <= 0 ||
      this.createAddrsErrorMessage.length > 0 ||
      this.cashOutAmountErrorMessage.length > 0 ||
      !this.depositAddresses?.DestinationAddress
    );
  }

  get isRefreshButtonDisabled() {
    return this.isRefreshingHistory || !(this.depositTicker && this.depositAddress);
  }

  get defaultDestinationAddress() {
    return this.depositAddresses?.DestinationAddress ?? "";
  }

  get conversionRate() {
    return this.megaswap.formatFloat(
      this.destinationAmountForDepositAmount?.SwapRateDestinationTickerPerDepositTicker ?? "0"
    );
  }

  get destinationAmount() {
    return this.megaswap.formatFloat(this.destinationAmountForDepositAmount?.DestinationAmount ?? "0");
  }

  get feeDeducted() {
    if (
      typeof this.destinationAmountForDepositAmount?.DepositFeeDeducted === "undefined" ||
      Number(this.destinationAmountForDepositAmount.DepositFeeDeducted) === 0
    ) {
      return null;
    }

    return parseFloat(this.destinationAmountForDepositAmount.DepositFeeDeducted);
  }

  get availableBalance() {
    if (!this.globalVars.loggedInUser) return 0;
    if (this.depositTicker === "DESO") {
      return this.globalVars.loggedInUser.BalanceNanos / 1e9;
    }
    // TODO: fetch usd balance in constructor
  }

  get depositAddress() {
    return this.depositAddresses?.DepositAddresses[this.depositTicker];
  }

  constructor(
    public megaswap: MegaswapService,
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

    if (this.depositAddresses) {
      this.megaswap
        .getDeposits({
          DepositTicker: this.depositTicker,
          DepositAddress: this.depositAddresses.DepositAddresses[this.depositTicker],
        })
        .pipe(
          first(),
          takeWhile(() => !this.isDestroyed)
        )
        .subscribe((res) => {
          this.cashOutHistory = res.Deposits;
        });
    }
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
      if (this.availableBalance && this.amountToCashOutInputValue > this.availableBalance) {
        this.cashOutAmountErrorMessage = `${this.amountToCashOutInputValue.toLocaleString()} exceeds your available balance of ${this.availableBalance.toLocaleString()}`;
      }
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
    this.amountToCashOutInputValue =
      (this.globalVars.loggedInUser?.BalanceNanos - this.globalVars.feeRateDeSoPerKB * 1e9) / 1e9;
    this.onAmountToCashOutChange();
  }

  onCashOut() {
    if (this.isPendingCashOut) return;
    const DepositAddress = this.depositAddress;
    if (!(this.depositAddresses?.DestinationAddress && DepositAddress)) {
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
    if (
      typeof this.amountToCashOutInputValue === "number" &&
      this.availableBalance &&
      this.amountToCashOutInputValue > this.availableBalance
    ) {
      this.cashOutErrorMessage = `${this.amountToCashOutInputValue.toLocaleString()} exceeds your available balance of ${this.availableBalance.toLocaleString()}`;
      return;
    }
    if (Number(this.destinationAmount) <= 0) {
      this.cashOutErrorMessage = "Cash out canceled. You'll receive $0.00 after network fees.";
      return;
    }

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
        switchMap(() => this.megaswap.getDeposits({ DepositTicker: this.depositTicker, DepositAddress })),
        first(),
        takeWhile(() => !this.isDestroyed),
        finalize(() => (this.isPendingCashOut = false))
      )
      .subscribe(this._onDepositEventsFetched.bind(this), (err) => {
        const maybeMegaswapError = err?.error?.error;
        this.cashOutErrorMessage =
          typeof maybeMegaswapError === "string"
            ? maybeMegaswapError
            : "An unexpected network error occurred while confirming your cash out. Try refreshing the page to see it's latest status.";
      });
  }

  refreshCashOutHistory() {
    if (this.isRefreshingHistory) return;
    if (!this.depositTicker) {
      throw new Error("depositTicker is a required component argument.");
    }
    if (!this.depositAddress) {
      throw new Error("depositAddress is a required component argument.");
    }
    this.isRefreshingHistory = true;
    this.megaswap
      .getDeposits({ DepositAddress: this.depositAddress, DepositTicker: this.depositTicker })
      .pipe(
        takeWhile(() => !this.isDestroyed),
        first(),
        finalize(() => (this.isRefreshingHistory = false))
      )
      .subscribe(this._onDepositEventsFetched.bind(this));
  }

  desoToUSD(desoAmount: number) {
    if (!this.destinationAmountForDepositAmount) return 0;
    const usdPerDeso = parseFloat(this.destinationAmountForDepositAmount.SwapRateDestinationTickerPerDepositTicker);
    return desoAmount * usdPerDeso;
  }

  private _onDepositEventsFetched(res: { Deposits: DepositEvent[] }) {
    this.cashOutHistory = res.Deposits;
    if (this.globalVars.isMobile()) {
      document.getElementById("cash-out-tx-history")?.scrollIntoView({ behavior: "smooth" });
    }
  }
}
