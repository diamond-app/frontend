import { Location } from "@angular/common";
import { Component, Input } from "@angular/core";
import { environment } from "src/environments/environment";
import { AppRoutingModule } from "../../app-routing.module";
import { ProfileEntryResponse } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "top-bar-mobile-header",
  templateUrl: "./top-bar-mobile-header.component.html",
  styleUrls: ["./top-bar-mobile-header.component.scss"],
})
export class TopBarMobileHeaderComponent {
  // Certain pages only have a back button and a title for the top bar.
  @Input() simpleTopBar: boolean = false;
  @Input() inTutorial: boolean = false;
  @Input() title: string = null;
  @Input() publicKeyBase58Check: string = null;
  @Input() profileEntryResponse: ProfileEntryResponse = null;
  @Input() hideSearch: boolean = false;
  @Input() backButtonFn = () => {
    this.location.back();
  };
  isSearching = false;
  AppRoutingModule = AppRoutingModule;
  environment = environment;
  constructor(public globalVars: GlobalVarsService, private location: Location) {}

  initiateSearch() {
    this.isSearching = true;
    // this will make the execution after the above boolean has changed
    setTimeout(() => {
      const searchElement = document.getElementById("searchbar");
      searchElement.focus();
    }, 0);
  }
}
