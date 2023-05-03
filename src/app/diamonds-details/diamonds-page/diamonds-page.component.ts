import { Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { PageLayoutService } from "../../../page-layout.service";
import { TranslocoService } from "@ngneat/transloco";

@Component({
  selector: "diamonds-page",
  templateUrl: "./diamonds-page.component.html",
})
export class DiamondsPageComponent {
  @Input() postHashHex: string;

  constructor(
    public globalVars: GlobalVarsService,
    private pageLayoutService: PageLayoutService,
    private translocoService: TranslocoService
  ) {
    this.pageLayoutService.updateConfig({
      simpleTopBar: this.globalVars.isMobile(),
      title: this.translocoService.translate("diamonds_pages.diamonds_given_by"),
    });
  }
}
