import {Component, Input} from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { SwalHelper } from "../../lib/helpers/swal-helper";

@Component({
  selector: "jumio-status",
  templateUrl: "./jumio-status.component.html",
  styleUrls: ["./jumio-status.component.scss"],
})
export class JumioStatusComponent {
  @Input() message: string = "Click here to get";
  constructor(public globalVars: GlobalVarsService) {}

  hideFreeMoneyBanner(event) {
    event.stopPropagation();
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Hide banner",
      html: "Do you want to hide the free money banner?",
      showCancelButton: true,
      showConfirmButton: true,
      focusConfirm: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      confirmButtonText: "Yes",
      cancelButtonText: "No",
      reverseButtons: true,
    }).then(async (alertRes: any) => {
      if (alertRes.isConfirmed) {
        this.globalVars.setShowFreeMoneyBanner(false);
      }
    });
  }
}
