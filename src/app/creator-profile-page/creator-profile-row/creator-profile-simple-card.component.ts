import { Component, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";

@Component({
  selector: "creator-profile-simple-card",
  templateUrl: "./creator-profile-simple-card.component.html",
  styleUrls: ["./creator-profile-simple-card.component.scss"],
})
export class CreatorProfileSimpleCardComponent {
  @Input() profile: any;

  constructor(private globalVars: GlobalVarsService) {}
}
