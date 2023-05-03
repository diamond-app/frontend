import { Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { PageLayoutService } from "../../../page-layout.service";

@Component({
  selector: "reactions-page",
  templateUrl: "./reactions-page.component.html",
})
export class ReactionsPageComponent {
  @Input() postHashHex: string;

  constructor(public globalVars: GlobalVarsService, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      simpleTopBar: this.globalVars.isMobile(),
      title: "Reacted By",
    });
  }
}
