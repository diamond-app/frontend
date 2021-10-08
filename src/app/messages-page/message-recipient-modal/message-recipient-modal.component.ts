import { Component, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BsModalRef } from "ngx-bootstrap/modal";

@Component({
  selector: "message-recipient-modal",
  templateUrl: "./message-recipient-modal.component.html",
  styleUrls: ["./message-recipient-modal.component.scss"],
})
export class MessageRecipientModalComponent implements AfterViewInit {
  @Output() userSelected = new EventEmitter();
  @ViewChild("searchbar", { static: true }) searchBar: ElementRef;
  searchHasResults = false;
  constructor(public globalVars: GlobalVarsService, public bsModalRef: BsModalRef) {}
  _handleCreatorSelectedInSearch(event) {
    this.userSelected.emit(event);
    this.bsModalRef.hide();
  }
  _handleSearchUpdated(event) {
    this.searchHasResults = event;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const searchElement = document.querySelector(".message-recipient-modal__header #searchbar");
      // @ts-ignore
      searchElement.focus();
    }, 0);
  }
}
