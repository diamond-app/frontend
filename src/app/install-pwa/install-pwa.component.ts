// @ts-strict
import { Component } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";

@Component({
  selector: "install-pwa",
  templateUrl: "./install-pwa.component.html",
  styleUrls: ["./install-pwa.component.scss"],
})
export class InstallPwaComponent {
  constructor(public globalVars: GlobalVarsService) {}
}
