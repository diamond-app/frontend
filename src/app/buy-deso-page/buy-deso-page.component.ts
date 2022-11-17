import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { GlobalVarsService } from "../global-vars.service";

@Component({
  selector: "buy-deso-page",
  templateUrl: "./buy-deso-page.component.html",
  styleUrls: ["./buy-deso-page.component.scss"],
})
export class BuyDeSoPageComponent {
  isLeftBarMobileOpen: boolean = false;
  constructor(public globalVars: GlobalVarsService, private router: Router) {}

  // ngOnInit() {
  //   this.router.navigate(["/" + this.globalVars.RouteNames.BUY_DESO], { skipLocationChange: true });
  // }
}
