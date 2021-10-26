import { Component, Input, OnInit } from "@angular/core";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import { NFTEntryResponse, PostEntryResponse } from "../../backend-api.service";

@Component({
  selector: "transfer-nft-modal",
  templateUrl: "./transfer-nft-modal.component.html",
  styleUrls: ["./transfer-nft-modal.component.scss"],
})
export class TransferNftModalComponent {
  isLeftBarMobileOpen: boolean = false;
  title: string = null;
  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;

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
