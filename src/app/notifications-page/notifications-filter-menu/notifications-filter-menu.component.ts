import { Component, OnInit } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService } from "../../backend-api.service";

@Component({
  selector: "notifications-filter-menu",
  templateUrl: "./notifications-filter-menu.component.html",
})
export class NotificationsFilterMenuComponent {
  constructor(private globalVars: GlobalVarsService, private backendApi: BackendApiService) {}

  public messageFilterFollowingMe = this.backendApi.GetStorage("customMessagesRequestsFollowersOnly");
  public messageFilterIFollow = this.backendApi.GetStorage("customMessagesRequestsFollowedOnly");
  public messageFilterHoldsMe = this.backendApi.GetStorage("customMessagesRequestsHoldersOnly");
  public messageFilterIHold = this.backendApi.GetStorage("customMessagesRequestsHoldingsOnly");
  public messageSortAlgorithm =
    this.backendApi.GetStorage("customMessagesSortAlgorithm") != null
      ? this.backendApi.GetStorage("customMessagesSortAlgorithm")
      : "time";
}
