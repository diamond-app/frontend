import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { Router } from "@angular/router";
import { GlobalVarsService } from "../global-vars.service";

@Component({
  selector: "tab-selector",
  templateUrl: "./tab-selector.component.html",
  styleUrls: ["./tab-selector.component.scss"],
})
export class TabSelectorComponent {
  @Output() tabClick = new EventEmitter<string>();
  @Input() tabs: any; // Should be a list of strings with tab names.
  @Input() activeTab: string;
  @Input() newTabs: string[] = [];
  @Input() linkTabs: {} = {};
  @Input() buttonSelector: boolean = true;
  @Input() deadTabs: Set<string> = new Set(); // A set of tabs that can't be clicked.

  constructor(public globalVars: GlobalVarsService) {}

  _tabClicked(tab: string) {
    if (tab in this.linkTabs) {
      window.open(this.linkTabs[tab], "_blank");
    } else {
      this.tabClick.emit(tab);
      if (this.deadTabs.has(tab)) {return}
      this.activeTab = tab;
    }
  }

  isLink(tabName: string) {
    return tabName in this.linkTabs
  }
}
