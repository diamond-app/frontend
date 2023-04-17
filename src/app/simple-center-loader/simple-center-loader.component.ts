import { Component, Input, OnInit } from "@angular/core";
import { environment } from "src/environments/environment";

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
  @Input() hideLoadingText: boolean = false;
  @Input() diamondHeight: number;
  environment = environment;

  isDark: boolean = false;

  constructor() {}

  ngOnInit() {
    this.isDark = localStorage.getItem("theme") === "dark";
  }

  reload() {
    window.location.reload();
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
    return this.diamondHeight || this.height / 4;
  }
}
