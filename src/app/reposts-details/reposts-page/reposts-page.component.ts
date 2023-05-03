import { Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "reposts-page",
  templateUrl: "./reposts-page.component.html",
})
export class RepostsPageComponent {
  @Input() postHashHex: string;

  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      simpleTopBar: this.globalVars.isMobile(),
      title: "Reposts",
    });
  }
}
