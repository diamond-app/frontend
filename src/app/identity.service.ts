import { HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { v4 as uuid } from "uuid";

export enum MessagingGroupOperation {
  DEFAULT_KEY = "DefaultKey",
  CREATE_GROUP = "CreateGroup",
  ADD_MEMBERS = "AddMembers",
}

export type IdentityMessagingResponse = {
  encryptedToApplicationGroupMessagingPrivateKey: string;
  encryptedToMembersGroupMessagingPrivateKey: string[];
  messagingKeySignature: string;
  messagingPublicKeyBase58Check: string;
  encryptedMessagingKeyRandomness: string | undefined;
};

export declare enum CreatorCoinLimitOperationString {
  ANY = "any",
  BUY = "buy",
  SELL = "sell",
  TRANSFER = "transfer",
}
export declare enum DAOCoinLimitOperationString {
  ANY = "any",
  MINT = "mint",
  BURN = "burn",
  DISABLE_MINTING = "disable_minting",
  UPDATE_TRANSFER_RESTRICTION_STATUS = "update_transfer_restriction_status",
  TRANSFER = "transfer",
}
export declare type CoinLimitOperationString = DAOCoinLimitOperationString | CreatorCoinLimitOperationString;
export interface CoinOperationLimitMap<T extends CoinLimitOperationString> {
  [public_key: string]: OperationToCountMap<T>;
}
export declare type OperationToCountMap<T extends LimitOperationString> = {
  [operation in T]?: number;
};
export declare type LimitOperationString =
  | DAOCoinLimitOperationString
  | CreatorCoinLimitOperationString
  | NFTLimitOperationString;
export declare type CreatorCoinOperationLimitMap = CoinOperationLimitMap<CreatorCoinLimitOperationString>;
export declare type DAOCoinOperationLimitMap = CoinOperationLimitMap<DAOCoinLimitOperationString>;
export declare type DAOCoinLimitOrderLimitMap = {
  [buying_public_key: string]: {
    [selling_public_key: string]: number;
  };
};
export declare enum NFTLimitOperationString {
  ANY = "any",
  UPDATE = "update",
  BID = "nft_bid",
  ACCEPT_BID = "accept_nft_bid",
  TRANSFER = "transfer",
  BURN = "burn",
  ACCEPT_TRANSFER = "accept_nft_transfer",
}
export interface NFTOperationLimitMap {
  [post_hash_hex: string]: {
    [serial_number: number]: OperationToCountMap<NFTLimitOperationString>;
  };
}
export declare enum TransactionType {
  BasicTransfer = "BASIC_TRANSFER",
  BitcoinExchange = "BITCOIN_EXCHANGE",
  PrivateMessage = "PRIVATE_MESSAGE",
  SubmitPost = "SUBMIT_POST",
  UpdateProfile = "UPDATE_PROFILE",
  UpdateBitcoinUSDExchangeRate = "UPDATE_BITCOIN_USD_EXCHANGE_RATE",
  Follow = "FOLLOW",
  Like = "LIKE",
  CreatorCoin = "CREATOR_COIN",
  SwapIdentity = "SWAP_IDENTITY",
  UpdateGlobalParams = "UPDATE_GLOBAL_PARAMS",
  CreatorCoinTransfer = "CREATOR_COIN_TRANSFER",
  CreateNFT = "CREATE_NFT",
  UpdateNFT = "UPDATE_NFT",
  AcceptNFTBid = "ACCEPT_NFT_BID",
  NFTBid = "NFT_BID",
  NFTTransfer = "NFT_TRANSFER",
  AcceptNFTTransfer = "ACCEPT_NFT_TRANSFER",
  BurnNFT = "BURN_NFT",
  AuthorizeDerivedKey = "AUTHORIZE_DERIVED_KEY",
  MessagingGroup = "MESSAGING_GROUP",
  DAOCoin = "DAO_COIN",
  DAOCoinTransfer = "DAO_COIN_TRANSFER",
  DAOCoinLimitOrder = "DAO_COIN_LIMIT_ORDER",
}
export interface TransactionSpendingLimitResponse {
  GlobalDESOLimit: number;
  TransactionCountLimitMap?: {
    [k in TransactionType]?: number;
  };
  CreatorCoinOperationLimitMap?: CreatorCoinOperationLimitMap;
  DAOCoinOperationLimitMap?: DAOCoinOperationLimitMap;
  NFTOperationLimitMap?: NFTOperationLimitMap;
  DAOCoinLimitOrderLimitMap?: DAOCoinLimitOrderLimitMap;
  DerivedKeyMemo?: string;
}
interface IdentitySignDerivedKeyPayload {
  accessSignature: string;
  btcDepositAddress: string;
  derivedJwt: string;
  derivedPublicKeyBase58Check: string;
  derivedSeedHex: string;
  derivedPublicKey: string;
  ethDepositAddress: string;
  expirationBlock: number;
  jwt: string;
  messagingKeyName: string;
  messagingKeySignature: string;
  messagingPrivateKey: string;
  messagingPublicKeyBase58Check: string;
  network: string;
  publicKeyBase58Check: string;
  transactionSpendingLimitHex: string;
}

@Injectable({
  providedIn: "root",
})
export class IdentityService {
  // Requests that were sent before the iframe initialized
  private pendingRequests = [];

  // All outbound request promises we still need to resolve
  private outboundRequests = {};

  // The currently active identity window
  private identityWindow;
  private identityWindowSubject;

  // The URL of the identity service
  identityServiceURL: string;
  sanitizedIdentityServiceURL;

  // User data
  identityServiceUsers;
  identityServicePublicKeyAdded: string;

  private initialized = false;
  private iframe = null;

  // Wait for storageGranted broadcast
  storageGranted = new Subject();

  // Using testnet or mainnet
  isTestnet = false;

  constructor() {
    window.addEventListener("message", (event) => this.handleMessage(event));
  }

  // Launch a new identity window

  launch(
    path?: string,
    params?: {
      publicKey?: string;
      tx?: string;
      referralCode?: string;
      public_key?: string;
      accessLevelRequest?: string;
      transactionSpendingLimitResponse?: any;
      operation?: MessagingGroupOperation;
      applicationMessagingPublicKeyBase58Check?: string;
      updatedGroupOwnerPublicKeyBase58Check?: string;
      updatedGroupKeyName?: string;
      updatedMembersPublicKeysBase58Check?: string[];
      updatedMembersKeyNames?: string[];
      hideJumio?: boolean;
      expirationDays?: number;
      getFreeDeso?: boolean;
    }
  ): Observable<any> {
    let url = this.identityServiceURL as string;
    if (path) {
      url += path;
    }

    let httpParams = new HttpParams();
    if (this.isTestnet) {
      httpParams = httpParams.append("testnet", "true");
    }

    if (params?.publicKey) {
      httpParams = httpParams.append("publicKey", params.publicKey);
    }

    if (params?.tx) {
      httpParams = httpParams.append("tx", params.tx);
    }

    if (params?.referralCode) {
      httpParams = httpParams.append("referralCode", params.referralCode);
    }

    if (params?.public_key) {
      httpParams = httpParams.append("public_key", params.public_key);
    }

    if (params?.accessLevelRequest) {
      httpParams = httpParams.append("accessLevelRequest", params.accessLevelRequest);
    }

    if (params?.hideJumio) {
      httpParams = httpParams.append("hideJumio", params.hideJumio.toString());
    }

    if (params?.operation) {
      httpParams = httpParams.append("operation", params.operation.toString());
    }
    if (params?.applicationMessagingPublicKeyBase58Check) {
      httpParams = httpParams.append(
        "applicationMessagingPublicKeyBase58Check",
        params.applicationMessagingPublicKeyBase58Check
      );
    }
    if (params?.updatedGroupOwnerPublicKeyBase58Check) {
      httpParams = httpParams.append(
        "updatedGroupOwnerPublicKeyBase58Check",
        params.updatedGroupOwnerPublicKeyBase58Check
      );
    }
    if (params?.updatedGroupKeyName) {
      httpParams = httpParams.append("updatedGroupKeyName", params.updatedGroupKeyName);
    }
    if (params?.updatedMembersPublicKeysBase58Check) {
      httpParams = httpParams.append(
        "updatedMembersPublicKeysBase58Check",
        params.updatedMembersPublicKeysBase58Check.join(",")
      );
    }
    if (params?.updatedMembersKeyNames) {
      httpParams = httpParams.append("updatedMembersKeyNames", params.updatedMembersKeyNames.join(","));
    }

    if (params?.transactionSpendingLimitResponse) {
      httpParams = httpParams.append(
        "transactionSpendingLimitResponse",
        encodeURIComponent(JSON.stringify(params.transactionSpendingLimitResponse))
      );
    }

    if (params?.expirationDays) {
      httpParams = httpParams.append("expirationDays", params.expirationDays.toString());
    }

    if (typeof params?.getFreeDeso !== "undefined") {
      httpParams = httpParams.append("getFreeDeso", params.getFreeDeso.toString());
    }

    const paramsStr = httpParams.toString();
    if (paramsStr) {
      url += `?${paramsStr}`;
    }

    // center the window
    const h = 1000;
    const w = 800;
    const y = window.outerHeight / 2 + window.screenY - h / 2;
    const x = window.outerWidth / 2 + window.screenX - w / 2;

    this.identityWindow = window.open(url, null, `toolbar=no, width=${w}, height=${h}, top=${y}, left=${x}`);
    this.identityWindowSubject = new Subject();

    return this.identityWindowSubject;
  }

  launchDefaultMessagingKey(publicKeyBase58Check: string): Observable<IdentityMessagingResponse> {
    return this.launch("/messaging-group", {
      operation: MessagingGroupOperation.DEFAULT_KEY,
      applicationMessagingPublicKeyBase58Check: publicKeyBase58Check,
      updatedGroupKeyName: "default-key",
      updatedGroupOwnerPublicKeyBase58Check: publicKeyBase58Check,
    });
  }

  // Outgoing messages

  burn(payload: {
    accessLevel: number;
    accessLevelHmac: string;
    encryptedSeedHex: string;
    unsignedHashes: string[];
  }): Observable<any> {
    return this.send("burn", payload);
  }

  signETH(payload: {
    accessLevel: number;
    accessLevelHmac: string;
    encryptedSeedHex: string;
    unsignedHashes: string[];
  }): Observable<any> {
    return this.send("signETH", payload);
  }

  sign(payload: {
    accessLevel: number;
    accessLevelHmac: string;
    encryptedSeedHex: string;
    transactionHex: string;
  }): Observable<any> {
    return this.send("sign", payload);
  }

  encrypt(payload: {
    accessLevel: number;
    accessLevelHmac: string;
    encryptedSeedHex: string;
    senderGroupKeyName: string;
    recipientPublicKey: string;
    encryptedMessagingKeyRandomness: string | undefined;
    derivedPublicKeyBase58Check: string | undefined;
    message: string;
  }): Observable<any> {
    return this.send("encrypt", payload);
  }

  decrypt(payload: {
    accessLevel: number;
    accessLevelHmac: string;
    encryptedSeedHex: string;
    encryptedMessages: any;
    derivedPublicKeyBase58Check: string | undefined;
    ownerPublicKeyBase58Check: string;
    encryptedMessagingKeyRandomness: string | undefined;
  }): Observable<any> {
    return this.send("decrypt", payload);
  }

  jwt(payload: { accessLevel: number; accessLevelHmac: string; encryptedSeedHex: string }): Observable<any> {
    return this.send("jwt", payload);
  }

  info(): Observable<any> {
    return this.send("info", {});
  }

  launchPhoneNumberVerification(public_key: string): Observable<{ phoneNumberSuccess: boolean }> {
    return this.launch("/verify-phone-number", {
      public_key,
    });
  }

  launchDerive(
    publicKey: string,
    transactionSpendingLimitResponse: TransactionSpendingLimitResponse,
    expirationDays: number = 30
  ): Observable<IdentitySignDerivedKeyPayload> {
    return this.launch("/derive", {
      publicKey,
      transactionSpendingLimitResponse,
      expirationDays,
    });
  }

  // Helpers

  identityServiceParamsForKey(publicKey: string) {
    const {
      encryptedSeedHex,
      accessLevel,
      accessLevelHmac,
      encryptedMessagingKeyRandomness,
      derivedPublicKeyBase58Check,
    } = this.identityServiceUsers[publicKey];
    return {
      encryptedSeedHex,
      accessLevel,
      accessLevelHmac,
      encryptedMessagingKeyRandomness,
      ownerPublicKeyBase58Check: publicKey,
      derivedPublicKeyBase58Check,
    };
  }

  // Incoming messages

  private handleInitialize(event: MessageEvent) {
    if (!this.initialized) {
      this.initialized = true;
      this.iframe = document.getElementById("identity");
      for (const request of this.pendingRequests) {
        this.postMessage(request);
      }
      this.pendingRequests = [];
    }

    // acknowledge, provides hostname data
    this.respond(event.source as Window, event.data.id, {});
  }

  private handleStorageGranted() {
    this.storageGranted.next(true);
    this.storageGranted.complete();
  }

  private handleLogin(payload: any) {
    this.identityWindow.close();
    this.identityWindow = null;

    this.identityWindowSubject.next(payload);
    this.identityWindowSubject.complete();
    this.identityWindowSubject = null;
  }

  private handleDerive(payload: any) {
    this.identityWindow.close();
    this.identityWindow = null;

    this.identityWindowSubject.next(payload);
    this.identityWindowSubject.complete();
    this.identityWindowSubject = null;
  }

  private handleInfo(id: string) {
    this.respond(this.identityWindow, id, {});
  }

  private handleMessagingGroup(payload: any) {
    this.identityWindow.close();
    this.identityWindow = null;

    this.identityWindowSubject.next(payload);
    this.identityWindowSubject.complete();
    this.identityWindowSubject = null;
  }

  // Message handling

  private handleMessage(event: MessageEvent) {
    const { data } = event;
    const { service, method } = data;

    if (service !== "identity") {
      return;
    }

    // Methods are present on incoming requests but not responses
    if (method) {
      this.handleRequest(event);
    } else {
      this.handleResponse(event);
    }
  }

  private handleRequest(event: MessageEvent) {
    const {
      data: { id, method, payload },
    } = event;

    if (method === "initialize") {
      this.handleInitialize(event);
    } else if (method === "storageGranted") {
      this.handleStorageGranted();
    } else if (method === "login") {
      this.handleLogin(payload);
    } else if (method === "info") {
      this.handleInfo(id);
    } else if (method === "messagingGroup") {
      this.handleMessagingGroup(payload);
    } else if (method === "derive") {
      this.handleDerive(payload);
    } else {
      console.error("Unhandled identity request");
      console.error(event);
    }
  }

  private handleResponse(event: MessageEvent) {
    const {
      data: { id, payload },
    } = event;

    const req = this.outboundRequests[id];
    req.next(payload);
    req.complete();
    delete this.outboundRequests[id];
  }

  // Send a new message and expect a response
  private send(method: string, payload: any) {
    const req = {
      id: uuid(),
      method,
      payload,
      service: "identity",
    };

    const subject = new Subject();
    this.postMessage(req);
    this.outboundRequests[req.id] = subject;

    return subject;
  }

  private postMessage(req: any) {
    if (this.initialized) {
      this.iframe.contentWindow.postMessage(req, "*");
    } else {
      this.pendingRequests.push(req);
    }
  }

  // Respond to a received message
  private respond(window: Window, id: string, payload: any): void {
    window.postMessage({ id, service: "identity", payload }, "*");
  }
}
