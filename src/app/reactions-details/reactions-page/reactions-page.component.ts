import { Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "reactions-page",
  templateUrl: "./reactions-page.component.html",
})
export class ReactionsPageComponent {
  @Input() postHashHex: string;

  constructor(public globalVars: GlobalVarsService) {}
}
