import { Component, OnInit } from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { BackendApiService } from "../backend-api.service";
import { Title } from "@angular/platform-browser";
import { ThemeService } from "../theme/theme.service";
import { environment } from "src/environments/environment";
import { BsModalService } from "ngx-bootstrap/modal";
import { TranslocoService } from "@ngneat/transloco";

@Component({
  selector: "settings",
  templateUrl: "./settings.component.html",
  styleUrls: ["./settings.component.scss"],
})
export class SettingsComponent implements OnInit {
  loading = false;
  emailAddress = "";
  invalidEmailEntered = false;
  environment = environment;
  selectedLanguage: string;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private titleService: Title,
    private bsModalService: BsModalService,
    public themeService: ThemeService,
    private translocoService: TranslocoService
  ) {}

  closeModal() {
    this.bsModalService.hide();
  }

  selectLanguage(event: any) {
    const languageCode = event.target.value;
    this.translocoService.setActiveLang(languageCode);
  }

  selectChangeHandler(event: any) {
    const newTheme = event.target.value;
    this.themeService.setTheme(newTheme);
  }

  updateShowPriceInFeed() {
    this.globalVars.setShowPriceOnFeed(!this.globalVars.showPriceOnFeed);
    this.globalVars.updateEverything();
  }

  ngOnInit() {
    this.titleService.setTitle(`Settings - ${environment.node.name}`);
    this.selectedLanguage = this.translocoService.getActiveLang();
  }
}
