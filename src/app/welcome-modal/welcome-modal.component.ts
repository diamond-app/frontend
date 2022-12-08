//@ts-strict
import { Component } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-welcome-modal",
  templateUrl: "./welcome-modal.component.html",
  styleUrls: ["./welcome-modal.component.scss"],
})
export class WelcomeModalComponent {
  constructor(public bsModalRef: BsModalRef, private globalVars: GlobalVarsService) {}

  login() {
    alert("login");
  }
}
