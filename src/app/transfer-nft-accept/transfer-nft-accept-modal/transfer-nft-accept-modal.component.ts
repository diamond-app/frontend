import {Component, Input, OnInit} from "@angular/core";
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";
import { NFTEntryResponse, PostEntryResponse } from "../../backend-api.service";

@Component({
  selector: "transfer-nft-accept-modal",
  templateUrl: "./transfer-nft-accept-modal.component.html",
  styleUrls: ["./transfer-nft-accept-modal.component.scss"],
})
export class TransferNftAcceptModalComponent {
  isLeftBarMobileOpen: boolean = false;
  title: string = null;
  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;
  @Input() transferNFTEntryResponses: NFTEntryResponse[];

  constructor(private bsModalRef: BsModalRef, private modalService: BsModalService) {}

  closeModal() {
    this.bsModalRef.hide();
  }

  closeModalEvent(event) {
    console.log(event);
    if (event) {
      this.modalService.setDismissReason(event);
    }
    this.bsModalRef.hide();
  }
}
