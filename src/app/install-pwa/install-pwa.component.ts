// @ts-strict
import { Component, Input } from "@angular/core";

@Component({
  selector: "install-pwa",
  templateUrl: "./install-pwa.component.html",
  styleUrls: ["./install-pwa.component.scss"],
})
export class InstallPwaComponent {
  @Input() closePanel = () => {};
}
