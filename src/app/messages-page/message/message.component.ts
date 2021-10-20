import { Component, OnInit, Input } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { AppRoutingModule } from "../../app-routing.module";

@Component({
  selector: "message",
  templateUrl: "./message.component.html",
  styleUrls: ["./message.component.scss"],
})
export class MessageComponent {
  @Input() message: any;
  @Input() nextMessage: any;
  @Input() profile: any;

  AppRoutingModule = AppRoutingModule;

  constructor(public globalVars: GlobalVarsService) {}
}
