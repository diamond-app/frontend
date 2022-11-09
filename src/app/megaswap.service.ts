//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, throwError, timer } from "rxjs";
import { map, mergeMap, retryWhen } from "rxjs/operators";
import { environment } from "src/environments/environment";

const buildUrl = (endpoint: string) => `${environment.megaswapAPI}/api/v1/${endpoint}`;

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

@Injectable({
  providedIn: "root",
})
export class MegaswapService {
  constructor(private httpClient: HttpClient) {}

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

  pollConfirmedDeposit(txId: string, endpointParams: GetDepositsParams): Observable<DepositEvent> {
    return this.getDeposits(endpointParams).pipe(
      map((res) => {
        const confirmed = res.Deposits.find(
          ({ DepositStatus, DepositTxId }) => DepositTxId === txId && DepositStatus === "DESTINATION_TRANSFER_CONFIRMED"
        );

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
            return timer(2000);
          })
        )
      )
    );
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
