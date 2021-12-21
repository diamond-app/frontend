// TODO: creator coin buys: no-balance case is kinda dumb, we should have a module telling you to buy deso or
// creator coin

// TODO: creator coin buys: need warning about potential slippage

// TODO: creator coin buys: may need tiptips explaining why total != amount * currentPriceElsewhereOnSite

import { Component, Input, OnInit, ViewChild } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService, TutorialStatus } from "../../backend-api.service";
import { ActivatedRoute, Router } from "@angular/router";
import { CreatorCoinTrade } from "../../../lib/trade-creator-page/creator-coin-trade";
import { RouteNames } from "../../app-routing.module";
import { Observable, Subscription } from "rxjs";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import { TradeCreatorFormComponent } from "../trade-creator-form/trade-creator-form.component";
import * as introJs from "intro.js/intro.js";
import { TradeCreatorPreviewComponent } from "../trade-creator-preview/trade-creator-preview.component";
import { BuyDesoModalComponent } from "../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { SwalHelper } from "../../../lib/helpers/swal-helper";

@Component({
  selector: "trade-creator-modal",
  templateUrl: "./trade-creator-modal.component.html",
  styleUrls: ["./trade-creator-modal.component.scss"],
})
export class TradeCreatorModalComponent {
  @Input() inTutorial: boolean = false;
  @Input() tutorialBuy: boolean;
  @Input() username: string;
  @Input() tradeType: string;

  constructor(private globalVars: GlobalVarsService, public bsModalRef: BsModalRef) {}
}
