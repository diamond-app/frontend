import { Component, Input } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";
import { ProfileEntryResponse } from "deso-protocol";

@Component({
  selector: "transfer-deso-modal",
  templateUrl: "./transfer-deso-modal.component.html",
  styleUrls: ["./transfer-deso-modal.component.scss"],
})
export class TransferDesoModalComponent {
  @Input() creatorToPayInput: ProfileEntryResponse;
  constructor(public bsModalRef: BsModalRef) {}
}
