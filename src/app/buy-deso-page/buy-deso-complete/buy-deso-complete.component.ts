import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "buy-deso-complete",
  templateUrl: "./buy-deso-complete.component.html",
  styleUrls: ["./buy-deso-complete.component.scss"],
})
export class BuyDESOCompleteComponent implements OnInit {
  @Output() buyMoreDESOClicked = new EventEmitter();

  globalVars: GlobalVarsService;

  amountOfDESOBought: number = 0;

  constructor(private _globalVars: GlobalVarsService) {
    this.globalVars = _globalVars;
  }

  triggerBuyMoreDESO() {
    this.buyMoreDESOClicked.emit();
  }

  ngOnInit() {
    window.scroll(0, 0);
  }
}
