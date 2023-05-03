import { Component } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { environment } from "src/environments/environment";
import { PageLayoutService } from "../../page-layout.service";

@Component({
  selector: "create-long-post-page",
  templateUrl: "./create-long-post-page.component.html",
  styleUrls: ["./create-long-post-page.component.scss"],
})
export class CreateLongPostPageComponent {
  constructor(private titleService: Title, private pageLayoutService: PageLayoutService) {
    this.pageLayoutService.updateConfig({
      hideSidebar: true,
    });
  }

  ngOnInit() {
    this.titleService.setTitle(`Notifications - ${environment.node.name}`);
  }
}
