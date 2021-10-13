import { Component, Input } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";

@Component({
  selector: "direct-to-native-browser-modal",
  templateUrl: "./direct-to-native-browser-modal.component.html",
  styleUrls: ["./direct-to-native-browser-modal.component.scss"],
})
export class DirectToNativeBrowserModalComponent {
  @Input() deviceType: string;
  constructor(public bsModalRef: BsModalRef) {}
}
