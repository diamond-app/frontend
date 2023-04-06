import { Component } from "@angular/core";
import { identity } from "deso-protocol";
import { from } from "rxjs";
import { RouteNames } from "../../app-routing.module";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "update-profile-get-starter-deso",
  templateUrl: "./update-profile-get-starter-deso.component.html",
  styleUrls: ["./update-profile-get-starter-deso.component.scss"],
})
export class UpdateProfileGetStarterDeSoComponent {
  RouteNames = RouteNames;

  constructor(public globalVars: GlobalVarsService) {}

  // rounded to nearest integer
  minPurchaseAmountInUsdRoundedUp() {
    const satoshisPerBitcoin = 1e8;
    let minimumInBitcoin = this.globalVars.minSatoshisBurnedForProfileCreation / satoshisPerBitcoin;
    return Math.ceil(this.globalVars.usdPerBitcoinExchangeRate * minimumInBitcoin);
  }

  getCreateProfileMessage(): string {
    return "You need to buy DeSo with Bitcoin in order to create a profile.  This helps prevent spam.";
  }

  launchPhoneNumberVerification() {
    from(identity.verifyPhoneNumber()).subscribe((res: any) => {
      if (res.phoneNumberSuccess) {
        this.globalVars.updateEverything();
      }
    });
  }
}
