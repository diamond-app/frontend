import { Component, Input, OnInit } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { GlobalVarsService } from "src/app/global-vars.service";
import { Ticker } from "src/app/megaswap.service";
import { environment } from "src/environments/environment";

@Component({
  selector: "buy-deso-megaswap",
  templateUrl: "./buy-deso-megaswap.component.html",
  styleUrls: ["./buy-deso-megaswap.component.scss"],
})
export class BuyDeSoMegaSwapComponent implements OnInit {
  @Input() depositTicker: Ticker;
  iframeURL: SafeResourceUrl = "";
  private theme =
    {
      cake: "light-peach",
      dark: "dark-gray",
      greenish: "dark-green",
      icydark: "dark-icy",
      legends: "dark-brown",
      light: "light-white",
    }[localStorage.getItem("theme")] || "default";

  constructor(public globalVars: GlobalVarsService, private sanitizer: DomSanitizer, private route: ActivatedRoute) {}

  ngOnInit() {
    window.scroll(0, 0);
    if (this.theme === "default" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      this.theme = "dark-gray";
    }

    this.iframeURL = this.sanitizer.bypassSecurityTrustResourceUrl(
      [
        environment.megaswapURL,
        "/#/iframe/v1?",
        `network=${environment.production ? "mainnet" : "testnet"}`,
        `&theme=${this.theme}`,
        `&depositTicker=${this.depositTicker ?? "BTC"}`,
        "&destinationTickers=DESO",
        "&destinationTicker=DESO",
        `&destinationAddress=${this.globalVars.loggedInUser?.PublicKeyBase58Check || ""}`,
      ].join("")
    );
  }
}
