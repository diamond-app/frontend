import { Component, Input } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";

@Component({
  selector: "cashout-modal",
  templateUrl: "./cashout-modal.component.html",
  styleUrls: ["./cashout-modal.component.scss"],
})
export class CashoutModalComponent {
  @Input() depositTicker: "DESO" | "DUSD";
  constructor(public bsModalRef: BsModalRef) {}
}
