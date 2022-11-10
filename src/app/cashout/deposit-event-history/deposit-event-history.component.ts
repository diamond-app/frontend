//@ts-strict
import { Component, Input, OnChanges, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { finalize, takeWhile } from "rxjs/operators";
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

  isDestroyed: boolean = false;
  events?: DepositEvent[];
  depositsSubscription?: Subscription;
  isLoading: boolean = false;

  constructor(public megaswap: MegaswapService) {}

  ngOnChanges() {
    if (!this.depositTicker) {
      throw new Error("depositTicker is a required component argument.");
    }
    if (!this.depositAddress) {
      throw new Error("depositAddress is a required component argument.");
    }

    if (this.depositsSubscription) {
      this.depositsSubscription.unsubscribe();
    }

    this.isLoading = true;
    this.depositsSubscription = this.megaswap
      .pollPendingDeposits(this.depositEvents ?? [], {
        DepositAddress: this.depositAddress,
        DepositTicker: this.depositTicker,
      })
      .pipe(
        takeWhile(() => !this.isDestroyed),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((res) => {
        this.events = res.Deposits.map((e) => this.megaswap.formatDepositEvent(e));
      });
  }

  ngOnDestroy() {
    this.isDestroyed = true;
  }
}
