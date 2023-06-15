import { Component, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { GlobalVarsService } from "../global-vars.service";
import { environment } from "../../environments/environment";

@Component({
  selector: "app-notifications-page",
  templateUrl: "./notifications-page.component.html",
  styleUrls: ["./notifications-page.component.scss"],
})
export class NotificationsPageComponent implements OnInit {
  constructor(private titleService: Title, public globalVars: GlobalVarsService) {}

  ngOnInit() {
    this.titleService.setTitle(`Notifications - ${environment.node.name}`);
  }
}
