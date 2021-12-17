import { Component } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import { BuyDesoModalComponent } from "../../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { BuyDeSoComponent } from "src/app/buy-deso-page/buy-deso/buy-deso.component";

@Component({
  selector: "sign-up-transfer-deso",
  templateUrl: "./sign-up-transfer-deso.component.html",
  styleUrls: ["./sign-up-transfer-deso.component.scss"],
})
export class SignUpTransferDesoComponent {
  SignUpGetStarterDeSoComponent = SignUpTransferDesoComponent;
  publicKeyIsCopied = false;
  showModal = true;
  modalReappear = false;
  BuyDeSoComponent = BuyDeSoComponent;

  constructor(public globalVars: GlobalVarsService, private modalService: BsModalService, public bsModalRef: BsModalRef) {}

  _copyPublicKey() {
    this.globalVars._copyText(this.globalVars.loggedInUser.PublicKeyBase58Check);
    this.publicKeyIsCopied = true;
    setInterval(() => {
      this.publicKeyIsCopied = false;
    }, 1000);
  }

  buyDesoModal() {
    this.showModal = false;
    const modalDetails = this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered",
    });
    const onHideEvent = modalDetails.onHide;
    onHideEvent.subscribe(() => {
      this.showModal = true;
      this.refreshBalance();
    });
  }

  refreshBalance() {
    this.globalVars.updateEverything();
  }

  openBuyDeSoModal(isFiat: boolean) {
    this.showModal = false;
    this.modalReappear = false;
    const initialState = {
      activeTabInput: isFiat ? this.BuyDeSoComponent.BUY_WITH_USD : this.BuyDeSoComponent.BUY_WITH_BTC,
    };
    const modalDetails = this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
      initialState,
    });
    const onHideEvent = modalDetails.onHide;
    onHideEvent.subscribe(() => {
      this.showModal = true;
      this.modalReappear = true;
      this.refreshBalance();
    });
  }
}
