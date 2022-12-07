//@ts-strict
import { Component } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";

@Component({
  selector: "app-welcome-modal",
  templateUrl: "./welcome-modal.component.html",
  styleUrls: ["./welcome-modal.component.scss"],
})
export class WelcomeModalComponent {
  constructor(public bsModalRef: BsModalRef) {}
}
