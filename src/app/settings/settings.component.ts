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

  async createNewUser(): Promise<any> {
    const derivedKey = await this.backendApi
      .CreateDerivedKey(this.globalVars.loggedInUser.PublicKeyBase58Check, "update_profile")
      .toPromise();
    const profilePic = `data:image/webp;base64,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`
    await this.globalVars.launchDeriveFlow(derivedKey.DerivedPublicKeyBase58Check);
    await this.backendApi
      .CreateUserProfile(
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        derivedKey.DerivedPublicKeyBase58Check,
        "zurg",
        "I have a desc",
        profilePic
      )
      .toPromise();
    console.log("Done");
  }

  ngOnInit() {
    this.titleService.setTitle(`Settings - ${environment.node.name}`);
    this.selectedLanguage = this.translocoService.getActiveLang();
  }
}
