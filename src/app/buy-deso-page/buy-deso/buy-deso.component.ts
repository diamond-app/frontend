// @ts-strict
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Ticker } from "src/app/megaswap.service";
import { GlobalVarsService } from "../../global-vars.service";

const SUPPORTED_DEPOSIT_TICKERS = ["BTC", "SOL", "USDC", "ETH", "DUSD"];

@Component({
  selector: "buy-deso",
  templateUrl: "./buy-deso.component.html",
  styleUrls: ["./buy-deso.component.scss"],
})
export class BuyDeSoComponent implements OnInit {
  @Input() isModal: boolean = false;
  @Input() activeTabInput?: string;
  @Output() closeModal = new EventEmitter();
  @Output() showCloseButton = new EventEmitter<boolean>();

  depositTicker?: Ticker;

  BuyDeSoComponent = BuyDeSoComponent;

  static BUY_WITH_MEGASWAP = "Buy with Crypto";
  static BUY_WITH_USD = "Buy with fiat";
  static BUY_ON_CB = "Buy on Coinbase";
  static CB_LINK = "https://www.coinbase.com/price/decentralized-social";

  buyTabs = [BuyDeSoComponent.BUY_WITH_MEGASWAP, BuyDeSoComponent.BUY_WITH_USD, BuyDeSoComponent.BUY_ON_CB];
  activeTab?: string;
  linkTabs = { [BuyDeSoComponent.BUY_ON_CB]: BuyDeSoComponent.CB_LINK };

  constructor(public globalVars: GlobalVarsService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const ticker = (params.ticker ?? "").toUpperCase();
      if (ticker && SUPPORTED_DEPOSIT_TICKERS.includes(ticker)) {
        this.depositTicker = ticker;
      } else {
        this.depositTicker = "BTC";
      }
    });

    this.activeTab = this.activeTabInput ?? BuyDeSoComponent.BUY_WITH_MEGASWAP;
  }
}
