import { Injectable } from "@angular/core";
import { identity } from "deso-protocol";
import { from, Observable, Subject } from "rxjs";
import { TrackingService } from "src/app/tracking.service";
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

  constructor(private tracking: TrackingService) {}

  launchPhoneNumberVerification(public_key: string): Observable<{ phoneNumberSuccess: boolean }> {
    return from(identity.verifyPhoneNumber()) as Observable<{ phoneNumberSuccess: boolean }>;
  }

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
  private respond(window: Window, id: string, payload: any): void {}
}
