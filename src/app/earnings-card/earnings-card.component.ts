//@ts-strict
import { Component, Input, OnChanges, OnDestroy } from "@angular/core";
import { finalize, first, takeWhile } from "rxjs/operators";
import { OpenProsperEarningsDetail } from "../../lib/services/openProsper/openprosper-service";
import { ApiInternalService } from "../api-internal.service";
import { GlobalVarsService } from "../global-vars.service";
import { ProfileEntryResponse } from "deso-protocol";

@Component({
  selector: "app-earnings-card",
  templateUrl: "./earnings-card.component.html",
  styleUrls: ["./earnings-card.component.scss"],
})
export class EarningsCardComponent implements OnChanges, OnDestroy {
  @Input() profile?: ProfileEntryResponse;

  isDestroyed: boolean = false;
  earningsDetail?: OpenProsperEarningsDetail;
  isLoading: boolean = false;
  apiError: string = "";
  isNftEarningsBreakdownOpen: boolean = false;

  get totalEarningsNanos() {
    const { DiamondsReceivedNanos = 0, FREarnedNanos = 0, NFTEarnings = 0 } = this.earningsDetail ?? {};
    return DiamondsReceivedNanos + FREarnedNanos + NFTEarnings;
  }

  get nftRoyaltiesNanos() {
    const {
      NFTOwnSecondarySaleNanos = 0,
      NFTOtherSecondarySaleNanos = 0,
      NFTRoyaltySplitSaleNanos = 0,
    } = this.earningsDetail?.NFTEarningsBreakdown ?? {};
    return NFTOwnSecondarySaleNanos + NFTOtherSecondarySaleNanos + NFTRoyaltySplitSaleNanos;
  }

  get nftPrimarySalesNanos() {
    const { NFTPrimarySaleNanos = 0, NFTBuyNowNanos = 0 } = this.earningsDetail?.NFTEarningsBreakdown ?? {};
    return NFTPrimarySaleNanos + NFTBuyNowNanos;
  }

  constructor(private apiInternal: ApiInternalService, public globalVars: GlobalVarsService) {}

  ngOnChanges() {
    if (!this.profile) {
      throw new Error("profile is a required input");
    }

    this.isLoading = true;
    this.apiInternal
      .getEarningsDetail(this.profile.PublicKeyBase58Check)
      .pipe(
        takeWhile(() => !this.isDestroyed),
        first(),
        finalize(() => (this.isLoading = false))
      )
      .subscribe(
        (earnings) => {
          this.earningsDetail = earnings;
          this.apiError = "";
        },
        (err) => {
          this.earningsDetail = undefined;
          this.apiError = "Whoops, something went wrong. Try reloading the page.";
        }
      );
  }

  ngOnDestroy() {
    this.isDestroyed = true;
  }
}
