//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, throwError, timer } from "rxjs";
import { map, mergeMap, retryWhen } from "rxjs/operators";
import { environment } from "src/environments/environment";

const buildUrl = (endpoint: string) => `${environment.megaswapAPI}/api/v1/${endpoint}`;

export type Ticker = "DESO" | "BTC" | "SOL" | "USDC" | "ETH" | "DUSD";
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
interface GetDepositsParams {
  DepositTicker: string;
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

  createDepositAddresses(postParams: { DestinationTicker: string; DestinationAddress: string }) {
    return this.httpClient.post<CreateAddrsResponse>(buildUrl("addrs"), postParams);
  }

  getNewDeposits(endpointParams: GetDepositsParams): Observable<GetDepositsResponse> {
    return this.httpClient.get<{ Deposits: DepositEvent[] }>(
      buildUrl(`new-deposits/${Object.values(endpointParams).join("/")}`)
    );
  }

  getDeposits(endpointParams: GetDepositsParams): Observable<GetDepositsResponse> {
    return this.httpClient.get<GetDepositsResponse>(buildUrl(`deposits/${Object.values(endpointParams).join("/")}`));
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
}
