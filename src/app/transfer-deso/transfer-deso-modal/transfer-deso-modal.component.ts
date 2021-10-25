import { Component, Input, OnInit } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";
import { ProfileEntryResponse } from "../../backend-api.service";

@Component({
  selector: "transfer-deso-modal",
  templateUrl: "./transfer-deso-modal.component.html",
  styleUrls: ["./transfer-deso-modal.component.scss"],
})
export class TransferDesoModalComponent {
  @Input() creatorToPayInput: ProfileEntryResponse;
  constructor(public bsModalRef: BsModalRef) {}
}
