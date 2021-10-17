import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService } from "../../backend-api.service";

@Component({
  selector: "notifications-filter-menu",
  templateUrl: "./notifications-filter-menu.component.html",
})
export class NotificationsFilterMenuComponent implements OnInit {
  constructor(private globalVars: GlobalVarsService, private backendApi: BackendApiService) {}
  @Output() closeFilter = new EventEmitter();
  @Output() updateSettingsEvent = new EventEmitter();

  @Input() filteredOutSetInput: Set<string>;
  @Input() expandNotificationsInput: boolean;

  filteredOutSet: Set<string>;
  expandNotifications: boolean;

  ngOnInit() {
    this.filteredOutSet = new Set(this.filteredOutSetInput);
    this.expandNotifications = this.expandNotificationsInput;
  }

  updateFilters(filter) {
    if (this.filteredOutSet.has(filter)) {
      this.filteredOutSet.delete(filter);
    } else {
      this.filteredOutSet.add(filter)
    }
  }

  updateSettings() {
    const settings = {
      filteredOutSet: this.filteredOutSet,
      expandNotifications: this.expandNotifications
    }
    console.log("Here are the settings");
    console.log(settings);
    this.updateSettingsEvent.emit(settings);
    this.closeFilter.emit();
  }

  updateCompactView() {
    this.expandNotifications = !this.expandNotifications
  }

  public messageFilterFollowingMe = this.backendApi.GetStorage("customMessagesRequestsFollowersOnly");
  public messageFilterIFollow = this.backendApi.GetStorage("customMessagesRequestsFollowedOnly");
  public messageFilterHoldsMe = this.backendApi.GetStorage("customMessagesRequestsHoldersOnly");
  public messageFilterIHold = this.backendApi.GetStorage("customMessagesRequestsHoldingsOnly");
  public messageSortAlgorithm =
    this.backendApi.GetStorage("customMessagesSortAlgorithm") != null
      ? this.backendApi.GetStorage("customMessagesSortAlgorithm")
      : "time";
}
