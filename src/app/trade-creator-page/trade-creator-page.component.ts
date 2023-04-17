import { Component } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";

@Component({
  selector: "trade-creator-page",
  templateUrl: "./trade-creator-page.component.html",
  styleUrls: ["./trade-creator-page.component.scss"],
})
export class TradeCreatorPageComponent {
  constructor(public globalVars: GlobalVarsService) {}
}
