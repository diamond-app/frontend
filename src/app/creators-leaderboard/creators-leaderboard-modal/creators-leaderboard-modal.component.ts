import { Component } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";

@Component({
  selector: "creators-leaderboard-modal",
  templateUrl: "./creators-leaderboard-modal.component.html",
  styleUrls: ["./creators-leaderboard-modal.component.scss"],
})
export class CreatorsLeaderboardModalComponent {
  constructor(
    public bsModalRef: BsModalRef,
  ) {}
}
