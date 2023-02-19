import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from "@angular/core";
import { TrackingService } from "src/app/tracking.service";
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
  @Input() onTabClick?: (tab: string) => void = () => {};
  @Input() highlightTab?: boolean = false;

  @ContentChild("tabItem", { static: false }) tabItemRef: TemplateRef<any>;

  constructor(public globalVars: GlobalVarsService, private tracking: TrackingService) {}

  _tabClicked(tab: string) {
    this.onTabClick?.(tab);
    if (tab in this.linkTabs) {
      window.open(this.linkTabs[tab], "_blank");
    } else {
      this.tabClick.emit(tab);
      if (this.deadTabs.has(tab)) {
        return;
      }
      this.activeTab = tab;
    }
  }

  isLink(tabName: string) {
    return tabName in this.linkTabs;
  }
}
