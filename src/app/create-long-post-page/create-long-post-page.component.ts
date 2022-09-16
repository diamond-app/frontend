import { Component, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { environment } from "src/environments/environment";

@Component({
  selector: "create-long-post-page",
  templateUrl: "./create-long-post-page.component.html",
  styleUrls: ["./create-long-post-page.component.scss"],
})
export class CreateLongPostPageComponent {
  constructor(private titleService: Title) {}

  ngOnInit() {
    this.titleService.setTitle(`Notifications - ${environment.node.name}`);
  }
}
