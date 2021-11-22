import {Component, Input} from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { SwalHelper } from "../../lib/helpers/swal-helper";

@Component({
  selector: "jumio-status",
  templateUrl: "./jumio-status.component.html",
  styleUrls: ["./jumio-status.component.scss"],
})
export class JumioStatusComponent {
  @Input() message: string = "jumio_status.click_here_to_get";
  constructor(public globalVars: GlobalVarsService) {}

  hideFreeMoneyBanner(event) {
    event.stopPropagation();
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "jumio_status.hide_banner",
      html: "jumio_status.hide_banner_message",
      showCancelButton: true,
      showConfirmButton: true,
      focusConfirm: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      confirmButtonText: "jumio_status.yes",
      cancelButtonText: "t(jumio_status.no)",
      reverseButtons: true,
    }).then(async (alertRes: any) => {
      if (alertRes.isConfirmed) {
        this.globalVars.setShowFreeMoneyBanner(false);
      }
    });
  }
}
