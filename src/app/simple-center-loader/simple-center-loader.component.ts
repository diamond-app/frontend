import { ApplicationRef, ChangeDetectorRef, Component, OnInit, Input, ViewEncapsulation } from "@angular/core";
import { AnimationOptions } from "ngx-lottie";
import { environment } from "src/environments/environment";
import { BackendApiService } from "../backend-api.service";

@Component({
  selector: "simple-center-loader",
  templateUrl: "./simple-center-loader.component.html",
  styleUrls: ["./simple-center-loader.component.scss"],
})
export class SimpleCenterLoaderComponent implements OnInit {
  @Input() titleLoadingText: string;
  @Input() subtitleLoadingText: string = "";
  @Input() spinnerColor: string = "gray";
  @Input() textColor: string = "gray";
  @Input() height = 400;
  environment = environment;

  isDark: boolean = false;

  options: AnimationOptions = {
    path: "./assets/img/cloutLoader.json",
  };
  constructor() {}

  ngOnInit() {
    this.isDark = localStorage.getItem("theme") === "dark";
  }

  doesFileExist(urlToFile) {
    const xhr = new XMLHttpRequest();
    try {
      xhr.open("HEAD", urlToFile, false);
      xhr.send();
    } catch (error) {}

    if (xhr.status === 404) {
      return false;
    } else {
      return true;
    }
  }

  getHeight() {
    return `${this.height.toString()}px`;
  }

  getLoaderHeight() {
    return `${(this.height / 4).toString()}px`;
  }
}
