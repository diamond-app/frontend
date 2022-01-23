import {Component, Input} from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { SwalHelper } from "../../lib/helpers/swal-helper";
import { TranslocoService } from "@ngneat/transloco";

@Component({
  selector: "jumio-status",
  templateUrl: "./jumio-status.component.html",
  styleUrls: ["./jumio-status.component.scss"],
})
export class JumioStatusComponent {
  @Input() message: string = "jumio_status.click_here_to_get";
  constructor(public globalVars: GlobalVarsService, private translocoService: TranslocoService) {}

  hideFreeMoneyBanner(event) {
    event.stopPropagation();
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: this.translocoService.translate("jumio_status.hide_banner"),
      html: this.translocoService.translate("jumio_status.hide_banner_message"),
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
