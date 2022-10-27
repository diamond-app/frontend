//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { BackendApiService } from "src/app/backend-api.service";
import { IdentityService } from "src/app/identity.service";
import { environment } from "src/environments/environment";

const ENDPOINTS = Object.freeze({
  appUser: "app-user",
  onboardingEmailSubscription: "onboarding-email-subscription",
});

const buildUrl = (endpoint: string) => `${environment.apiInternalHostname}/api-internal/v0/${endpoint}`;

interface CreateOrUpdateAppUserPayload {
  PublicKeyBase58check: string;
  Username: string;
  NotificationFrequency: number;
}

@Injectable({
  providedIn: "root",
})
export class ApiInternalService {
  appUser: any;

  constructor(
    private httpClient: HttpClient,
    private identity: IdentityService,
    private backendAPI: BackendApiService
  ) {}

  getAppUser(publickey: string): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap((headers) => this.httpClient.get<any>(buildUrl(`${ENDPOINTS.appUser}/${publickey}`), { headers }))
    );
  }

  createAppUser(payload: CreateOrUpdateAppUserPayload) {
    return this.getAuthHeaders().pipe(
      switchMap((headers) => this.httpClient.post<any>(buildUrl(ENDPOINTS.appUser), payload, { headers }))
    );
  }

  updateAppUser(payload: CreateOrUpdateAppUserPayload) {
    return this.getAuthHeaders().pipe(
      switchMap((headers) => this.httpClient.put<any>(buildUrl(ENDPOINTS.appUser), payload, { headers }))
    );
  }

  onboardingEmailSubscribe(PublicKeyBase58Check: string): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap((headers) =>
        this.httpClient.post<any>(buildUrl("onboarding-email-subscription"), { PublicKeyBase58Check }, { headers })
      )
    );
  }

  private getAuthHeaders(): Observable<{ Authorization: string; "Diamond-Public-Key-Base58-Check": string }> {
    const loggedInUserKey = this.backendAPI.GetStorage(this.backendAPI.LastLoggedInUserKey);

    return this.identity
      .jwt({
        ...this.identity.identityServiceParamsForKey(loggedInUserKey),
      })
      .pipe(
        map(({ jwt }) => ({
          Authorization: `Bearer ${jwt}`,
          "Diamond-Public-Key-Base58-Check": loggedInUserKey,
        }))
      );
  }
}
