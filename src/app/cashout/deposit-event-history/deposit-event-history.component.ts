//@ts-strict
import { Component, Input, OnChanges, OnDestroy } from "@angular/core";
import { finalize, first, takeWhile } from "rxjs/operators";
import { DepositEvent, MegaswapService, Ticker } from "src/app/megaswap.service";

@Component({
  selector: "deposit-event-history",
  templateUrl: "./deposit-event-history.component.html",
  styleUrls: ["./deposit-event-history.component.scss"],
})
export class DepositEventHistoryComponent implements OnChanges, OnDestroy {
  @Input() depositTicker?: Ticker;
  @Input() depositAddress?: string;
  @Input() depositEvents?: DepositEvent[];

  isLoading: boolean = false;
  isDestroyed: boolean = false;
  events?: DepositEvent[];

  constructor(private megaswap: MegaswapService) {}

  ngOnChanges() {
    if (this.depositEvents && this.depositEvents.length > 0) {
      this.events = this.depositEvents.map((e) => this.megaswap.formatDepositEvent(e));
      return;
    }

    if (!this.depositTicker) {
      throw new Error("depositTicker is a required component argument.");
    }
    if (!this.depositAddress) {
      throw new Error("depositAddress is a required component argument.");
    }

    this.isLoading = true;
    this.megaswap
      .getDeposits({ DepositAddress: this.depositAddress, DepositTicker: this.depositTicker })
      .pipe(
        takeWhile(() => !this.isDestroyed),
        first(),
        finalize(() => (this.isLoading = false))
      )
      .subscribe((res) => {
        this.events = res.Deposits.map((e) => this.megaswap.formatDepositEvent(e));
      });
  }

  ngOnDestroy() {
    this.isDestroyed = true;
  }
}
