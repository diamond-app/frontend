import { Component } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import { BuyDesoModalComponent } from "../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";

@Component({
  selector: "sign-up-transfer-deso",
  templateUrl: "./sign-up-transfer-deso.component.html",
  styleUrls: ["./sign-up-transfer-deso.component.scss"],
})
export class SignUpTransferDesoComponent {
  SignUpGetStarterDeSoComponent = SignUpTransferDesoComponent;
  publicKeyIsCopied = false;
  showCloseButton = true;

  constructor(public globalVars: GlobalVarsService, private modalService: BsModalService, public bsModalRef: BsModalRef) {}

  _copyPublicKey() {
    this.globalVars._copyText(this.globalVars.loggedInUser.PublicKeyBase58Check);
    this.publicKeyIsCopied = true;
    setInterval(() => {
      this.publicKeyIsCopied = false;
    }, 1000);
  }

  buyDesoModal() {
    this.showCloseButton = false;
    const modalDetails = this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered",
    });
    const onHideEvent = modalDetails.onHide;
    onHideEvent.subscribe(() => {
      this.showCloseButton = true;
      this.refreshBalance();
    });
  }

  refreshBalance() {
    this.globalVars.updateEverything();
  }
}
