import { Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "poll-page",
  templateUrl: "./poll-page.component.html",
})
export class PollPageComponent {
  @Input() postHashHex: string;

  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      simpleTopBar: this.globalVars.isMobile(),
      title: "Voted By",
    });
  }
}
