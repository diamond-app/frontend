import { Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BsModalRef } from "ngx-bootstrap/modal";

@Component({
  selector: "reactions-modal",
  templateUrl: "./reactions-modal.component.html",
})
export class ReactionsModalComponent {
  @Input() postHashHex: string;

  constructor(public globalVars: GlobalVarsService, public bsModalRef: BsModalRef) {}
}
