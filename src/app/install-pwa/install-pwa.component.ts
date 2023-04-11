import { Component, EventEmitter, Output } from "@angular/core";

@Component({
  selector: "install-pwa",
  templateUrl: "./install-pwa.component.html",
  styleUrls: ["./install-pwa.component.scss"],
})
export class InstallPwaComponent {
  @Output() closePanel = new EventEmitter<any>();
}
