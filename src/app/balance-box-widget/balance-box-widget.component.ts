import { Component, OnInit } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { BuyDesoModalComponent } from "../buy-deso-page/buy-deso-modal/buy-deso-modal.component";
import { BsModalService } from "ngx-bootstrap/modal";

@Component({
  selector: 'balance-box-widget',
  templateUrl: './balance-box-widget.component.html',
  styleUrls: ['./balance-box-widget.component.scss']
})

export class BalanceBoxWidgetComponent implements OnInit {

  constructor(
    public globalVars: GlobalVarsService,
    private modalService: BsModalService,
  ) {}

  ngOnInit(): void {
  }

  openBuyCloutModal() {
    this.modalService.show(BuyDesoModalComponent, {
      class: "modal-dialog-centered buy-deso-modal",
      backdrop: "static",
    });
  }

}
