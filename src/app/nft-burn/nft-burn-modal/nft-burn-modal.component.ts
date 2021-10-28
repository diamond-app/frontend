import {Component, Input, OnInit} from "@angular/core";
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";
import { NFTEntryResponse, PostEntryResponse } from "../../backend-api.service";

@Component({
  selector: "nft-burn-modal",
  templateUrl: "./nft-burn-modal.component.html",
  styleUrls: ["./nft-burn-modal.component.scss"],
})
export class NftBurnModalComponent {
  isLeftBarMobileOpen: boolean = false;
  title: string = null;
  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;
  @Input() burnNFTEntryResponses: NFTEntryResponse[];

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
