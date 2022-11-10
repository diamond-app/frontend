//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of, throwError, timer } from "rxjs";
import { delay, last, map, mergeMap, repeatWhen, retryWhen, takeWhile } from "rxjs/operators";
import { GlobalVarsService } from "src/app/global-vars.service";
import { environment } from "src/environments/environment";

const buildUrl = (endpoint: string) => `${environment.megaswapAPI}/api/v1/${endpoint}`;
const PENDING_SWAP_STATUSES = new Set([
  "DEPOSIT_PENDING",
  "DEPOSIT_CONFIRMED",
  "DESTINATION_TRANSFER_RUNNING",
  "DESTINATION_TRANSFER_PENDING",
  "DESTINATION_TRANSFER_RETRIED",
]);

export type Ticker = "DESO" | "BTC" | "SOL" | "USDC" | "ETH" | "DUSD" | "USD";
export interface CreateAddrsResponse {
  DepositAddresses: Record<Ticker, string>;
  DestinationAddress?: string;
  DestinationTicker: Ticker;
}
export interface DestinationAmountForDepositAmount {
  DestinationTicker: Ticker;
  DepositTicker: Ticker;
  DepositFeeDeducted: string;
  DepositAmount: string;
  DestinationAmount: string;
  SwapRateDestinationTickerPerDepositTicker: string;
}
export type DepositStatus =
  | "DEPOSIT_PENDING"
  | "DEPOSIT_CONFIRMATION_FAILED"
  | "DEPOSIT_CONFIRMED"
  | "DEPOSIT_CANCELLED"
  | "DESTINATION_TRANSFER_RUNNING"
  | "DESTINATION_TRANSFER_PENDING"
  | "DESTINATION_TRANSFER_FAILED"
  | "DESTINATION_TRANSFER_TERMINATED"
  | "DESTINATION_TRANSFER_CONFIRMATION_FAILED"
  | "DESTINATION_TRANSFER_RETRIED"
  | "DESTINATION_TRANSFER_CONFIRMED"
  | "DESTINATION_TRANSFER_CANCELLED";

export interface DepositEvent {
  DepositTicker: Ticker;
  DepositTxId: string;
  DepositAddress: string;
  DepositAmount: string;
  DepositStatus: DepositStatus;
  DestinationTicker: Ticker;
  DestinationTxId: string;
  DestinationAddress: string;
  DestinationAmount: string;
  UpdatedAt: string;
  CreatedAt: string;
}
interface CreateAddrsParams {
  DestinationTicker: Ticker;
  DestinationAddress: string;
}
interface GetDepositsParams {
  DepositTicker: Ticker;
  DepositAddress: string;
}
interface GetDepositsResponse {
  Deposits: DepositEvent[];
}

const desoExplorerTypeConversion = {
  tx: "transaction-id",
  address: "public-key",
};

const MAINNET_EXPLORER_URLS = {
  blockcypher: "https://live.blockcypher.com/btc",
  deso: "https://node.deso.org",
  etherscan: "https://etherscan.io",
  megaswap: "https://megaswap.dev",
  solana: "https://explorer.solana.com",
};

export const TESTNET_EXPLORER_URLS = {
  blockcypher: "https://live.blockcypher.com/btc-testnet",
  deso: "https://test.deso.org",
  etherscan: "https://goerli.etherscan.io",
  megaswap: "https://dev.megaswap.dev",
  solana: "https://explorer.solana.com?cluster=devnet",
};

@Injectable({
  providedIn: "root",
})
export class MegaswapService {
  constructor(private httpClient: HttpClient, private globalVars: GlobalVarsService) {}

  createDepositAddresses(postParams: CreateAddrsParams) {
    return this.httpClient.post<CreateAddrsResponse>(buildUrl("addrs"), postParams);
  }

  getNewDeposits({ DepositTicker, DepositAddress }: GetDepositsParams): Observable<GetDepositsResponse> {
    return this.httpClient.get<GetDepositsResponse>(buildUrl(`new-deposits/${DepositTicker}/${DepositAddress}`));
  }

  getDeposits({ DepositTicker, DepositAddress }: GetDepositsParams): Observable<GetDepositsResponse> {
    return this.httpClient.get<GetDepositsResponse>(buildUrl(`deposits/${DepositTicker}/${DepositAddress}?order=DESC`));
  }

  pollNewDeposits(endpointParams: GetDepositsParams): Observable<DepositEvent> {
    return this.getNewDeposits(endpointParams).pipe(
      map((res) => {
        const confirmed = res.Deposits.find(({ DepositStatus }) => DepositStatus === "DEPOSIT_CONFIRMED");

        if (!confirmed) {
          throw new Error("RETRY");
        }

        return confirmed;
      }),
      retryWhen((e$) =>
        e$.pipe(
          mergeMap((e) => {
            if (e.message !== "RETRY") {
              return throwError(e);
            }
            return timer(5000);
          })
        )
      )
    );
  }

  pollPendingDeposits(
    depositEvents: DepositEvent[],
    endpointParams: GetDepositsParams
  ): Observable<GetDepositsResponse> {
    if (!depositEvents.some((d) => PENDING_SWAP_STATUSES.has(d.DepositStatus))) {
      // if there are no pending deposits, we can just return early.
      return of({ Deposits: depositEvents });
    }
    const $obs = this.getDeposits(endpointParams).pipe(
      repeatWhen(($completed) => $completed.pipe(delay(2000))),
      takeWhile((res) => {
        return res.Deposits.some((d) => PENDING_SWAP_STATUSES.has(d.DepositStatus));
      }, true)
    );

    $obs.pipe(last()).subscribe((res) => {
      // This will update the user's balance after all pending deposits have
      // confirmed.
      this.globalVars.updateEverything();
    });

    return $obs;
  }

  getDestinationAmountForDepositAmount(
    depositAmount: string,
    depositTicker: Ticker,
    destinationTicker: Ticker
  ): Observable<DestinationAmountForDepositAmount> {
    return this.httpClient.get<DestinationAmountForDepositAmount>(
      buildUrl(`destination-amount-for-deposit-amount/${depositTicker}/${destinationTicker}/${depositAmount}`)
    );
  }

  getExplorerLink(ticker: Ticker, value: string, type: "tx" | "address") {
    const explorerUrls = this.globalVars.isTestnet ? TESTNET_EXPLORER_URLS : MAINNET_EXPLORER_URLS;

    switch (ticker) {
      case "ETH":
        return `${explorerUrls.etherscan}/${type}/${value}`;
      case "BTC":
        return `${explorerUrls.blockcypher}/${type}/${value}`;
      case "SOL":
        const { origin, search } = new URL(explorerUrls.solana);
        return `${origin}/${type}/${value}${search}`;
      case "DESO":
        return `https://explorer.deso.org/?query-node=${explorerUrls.deso}&${desoExplorerTypeConversion[type]}=${value}`;
      case "DUSD":
        return `https://explorer.deso.org/?query-node=${explorerUrls.deso}&${desoExplorerTypeConversion[type]}=${value}`;
      case "USDC":
        return `${explorerUrls.etherscan}/${type}/${value}`;
      default:
        throw new Error("Unsupported ticker");
    }
  }

  // formatters for UI presentation
  formatFloat(float: string | number, ticker?: Ticker) {
    const isUSD = ticker && ["USD", "DUSD", "USDC"].includes(ticker);
    return (typeof float === "string" ? parseFloat(float) : float).toLocaleString("en-US", {
      maximumFractionDigits: 5,
      minimumFractionDigits: isUSD ? 2 : 0,
      style: isUSD ? "currency" : "decimal",
      currency: isUSD ? "USD" : undefined,
    });
  }

  formatTicker(ticker: Ticker) {
    return ticker === "DUSD" ? "USD" : ticker;
  }

  formatDepositEvent(event: DepositEvent) {
    return {
      ...event,
      DepositTicker: this.formatTicker(event.DepositTicker),
      DepositAmount: this.formatFloat(event.DepositAmount, event.DepositTicker),
      DestinationTicker: this.formatTicker(event.DestinationTicker),
      DestinationAmount: this.formatFloat(event.DestinationAmount, event.DestinationTicker),
    };
  }
}
