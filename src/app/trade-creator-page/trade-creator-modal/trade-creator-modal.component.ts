// TODO: creator coin buys: no-balance case is kinda dumb, we should have a module telling you to buy deso or
// creator coin

// TODO: creator coin buys: need warning about potential slippage

// TODO: creator coin buys: may need tiptips explaining why total != amount * currentPriceElsewhereOnSite

import { Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BsModalRef } from "ngx-bootstrap/modal";

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
