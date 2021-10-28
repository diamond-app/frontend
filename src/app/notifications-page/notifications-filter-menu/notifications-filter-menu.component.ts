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

  @Input() filteredOutSetInput: {};
  @Input() expandNotificationsInput: boolean;

  filteredOutSet: {};
  expandNotifications: boolean;

  ngOnInit() {
    this.filteredOutSet = {...this.filteredOutSetInput};
    this.expandNotifications = this.expandNotificationsInput;
  }

  selectAll() {
    this.filteredOutSet = {};
  }

  selectNone() {
    this.filteredOutSet = {
      like: true,
      diamond: true,
      transfer: true,
      follow: true,
      post: true,
      nft: true,
    };
  }

  allSelected(): boolean {
    return Object.keys(this.filteredOutSet).length === 0;
  }
  selectAllOrNone() {
    if (this.allSelected()) {
      this.selectNone();
    } else {
      this.selectAll();
    }
  }

  updateFilters(filter) {
    if (filter in this.filteredOutSet) {
      delete this.filteredOutSet[filter];
    } else {
      this.filteredOutSet[filter] = true;
    }
  }

  updateSettings() {
    const settings = {
      filteredOutSet: this.filteredOutSet,
      expandNotifications: this.expandNotifications
    }
    this.updateSettingsEvent.emit(settings);
    this.closeFilter.emit();
  }

  updateCompactView() {
    this.expandNotifications = !this.expandNotifications
  }

}
