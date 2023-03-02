// FYI: any request that needs the HttpOnly cookie to be sent (e.g. b/c the server
// needs the seed phrase) needs the {withCredentials: true} option. It may also needed to
// get the browser to save the cookie in the response.
// https://github.com/github/fetch#sending-cookies
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import {
  acceptNFTTransfer,
  adminGetBuyDesoFeeBasisPoints,
  adminGetUSDCentsToDESOReserveExchangeRate,
  adminSetBuyDesoFeeBasisPoints,
  adminSetUSDCentsToDESOReserveExchangeRate,
  adminSwapIdentity,
  blockPublicKey,
  buildProfilePictureUrl,
  burnNFT,
  buyCreatorCoin,
  countPostAssociations,
  createNFT,
  createNFTBid,
  createPostAssociation,
  deletePostAssociation,
  DeSoBodySchema,
  getBlockTemplate,
  GetBlockTemplateResponse,
  getDiamondedPosts,
  getDiamondsForPost,
  getDiamondsForUser,
  GetExchangeRateResponse,
  getExchangeRates,
  getFollowersForUser,
  getHodlersForUser,
  getHotFeed,
  getLikesForPost,
  getNFTBidsForUser,
  getNFTCollectionSummary,
  getNFTsForUser,
  getNFTShowcase,
  getNotifications,
  getPostAssociations,
  getPostsForUser,
  getPostsStateless,
  getProfiles,
  getQuoteRepostsForPost,
  getRepostsForPost,
  getSinglePost,
  getSingleProfile,
  getTransaction,
  GetTxnResponse,
  getUserGlobalMetadata,
  getUserMetadata,
  getUsersStateless,
  identity,
  sellCreatorCoin,
  sendDeso,
  SendDeSoResponse,
  sendDiamonds,
  setNotificationMetadata,
  submitPost,
  SubmitTransactionResponse,
  transferCreatorCoin,
  updateFollowingStatus,
  updateLikeStatus,
  updateNFT,
  updateProfile,
  updateUserGlobalMetadata,
  User,
} from "deso-protocol";
import { EMPTY, from, Observable, of, throwError } from "rxjs";
import { catchError, expand, map, reduce, switchMap, tap, timeout } from "rxjs/operators";
import { environment } from "src/environments/environment";
import { parseCleanErrorMsg } from "../lib/helpers/pretty-errors";
import { SwalHelper } from "../lib/helpers/swal-helper";
import { IdentityService } from "./identity.service";

export class BackendRoutes {
  static SendDeSoRoute = "/api/v0/send-deso";
  static MinerControlRoute = "/api/v0/miner-control";

  static RoutePathSubmitPost = "/api/v0/submit-post";
  static RoutePathUploadImage = "/api/v0/upload-image";
  static RoutePathSubmitTransaction = "/api/v0/submit-transaction";
  static RoutePathUpdateProfile = "/api/v0/update-profile";
  static RoutePathGetPostsStateless = "/api/v0/get-posts-stateless";
  static RoutePathGetProfiles = "/api/v0/get-profiles";
  static RoutePathGetSingleProfile = "/api/v0/get-single-profile";
  static RoutePathGetSingleProfilePicture = "/api/v0/get-single-profile-picture";
  static RoutePathGetPostsForPublicKey = "/api/v0/get-posts-for-public-key";
  static RoutePathGetDiamondedPosts = "/api/v0/get-diamonded-posts";
  static RoutePathGetHodlersForPublicKey = "/api/v0/get-hodlers-for-public-key";
  static RoutePathSendMessageStateless = "/api/v0/send-message-stateless";
  static RoutePathGetMessagesStateless = "/api/v0/get-messages-stateless";
  static GetAllMessagingGroupKeys = "/api/v0/get-all-messaging-group-keys";
  static RoutePathCheckPartyMessagingKeys = "/api/v0/check-party-messaging-keys";
  static RegisterGroupMessagingKey = "/api/v0/register-messaging-group-key";
  static RoutePathMarkContactMessagesRead = "/api/v0/mark-contact-messages-read";
  static RoutePathMarkAllMessagesRead = "/api/v0/mark-all-messages-read";
  static RoutePathGetFollowsStateless = "/api/v0/get-follows-stateless";
  static RoutePathCreateFollowTxnStateless = "/api/v0/create-follow-txn-stateless";
  static RoutePathCreateLikeStateless = "/api/v0/create-like-stateless";
  static RoutePathBuyOrSellCreatorCoin = "/api/v0/buy-or-sell-creator-coin";
  static RoutePathTransferCreatorCoin = "/api/v0/transfer-creator-coin";
  static RoutePathUpdateUserGlobalMetadata = "/api/v0/update-user-global-metadata";
  static RoutePathGetUserGlobalMetadata = "/api/v0/get-user-global-metadata";
  static RoutePathGetNotifications = "/api/v0/get-notifications";
  static RoutePathGetUnreadNotificationsCount = "/api/v0/get-unread-notifications-count";
  static RoutePathSetNotificationMetadata = "/api/v0/set-notification-metadata";
  static RoutePathGetAppState = "/api/v0/get-app-state";
  static RoutePathGetSinglePost = "/api/v0/get-single-post";
  static RoutePathSendPhoneNumberVerificationText = "/api/v0/send-phone-number-verification-text";
  static RoutePathSubmitPhoneNumberVerificationCode = "/api/v0/submit-phone-number-verification-code";
  static RoutePathBlockPublicKey = "/api/v0/block-public-key";
  static RoutePathGetBlockTemplate = "/api/v0/get-block-template";
  static RoutePathGetTxn = "/api/v0/get-txn";
  static RoutePathDeleteIdentities = "/api/v0/delete-identities";
  static RoutePathSendDiamonds = "/api/v0/send-diamonds";
  static RoutePathGetDiamondsForPublicKey = "/api/v0/get-diamonds-for-public-key";
  static RoutePathGetLikesForPost = "/api/v0/get-likes-for-post";
  static RoutePathGetDiamondsForPost = "/api/v0/get-diamonds-for-post";
  static RoutePathGetRepostsForPost = "/api/v0/get-reposts-for-post";
  static RoutePathGetQuoteRepostsForPost = "/api/v0/get-quote-reposts-for-post";
  static RoutePathGetJumioStatusForPublicKey = "/api/v0/get-jumio-status-for-public-key";
  static RoutePathGetHotFeed = "/api/v0/get-hot-feed";
  static RoutePathGetUserMetadata = "/api/v0/get-user-metadata";
  static RoutePathGetUsernameForPublicKey = "/api/v0/get-user-name-for-public-key";
  static RoutePathGetPublicKeyForUsername = "/api/v0/get-public-key-for-user-name";

  // Verify
  static RoutePathVerifyEmail = "/api/v0/verify-email";
  static RoutePathResendVerifyEmail = "/api/v0/resend-verify-email";

  // Tutorial
  static RoutePathStartOrSkipTutorial = "/api/v0/start-or-skip-tutorial";
  static RoutePathCompleteTutorial = "/api/v0/complete-tutorial";
  static RoutePathGetTutorialCreators = "/api/v0/get-tutorial-creators";
  static RoutePathUpdateTutorialStatus = "/api/v0/update-tutorial-status";

  // Media
  static RoutePathUploadVideo = "/api/v0/upload-video";
  static RoutePathGetVideoStatus = "/api/v0/get-video-status";
  static RoutePathGetLinkPreview = "/api/v0/link-preview";
  static RoutePathProxyImage = "/api/v0/proxy-image";

  // NFT routes.
  static RoutePathCreateNft = "/api/v0/create-nft";
  static RoutePathUpdateNFT = "/api/v0/update-nft";
  static RoutePathCreateNFTBid = "/api/v0/create-nft-bid";
  static RoutePathAcceptNFTBid = "/api/v0/accept-nft-bid";
  static RoutePathGetNFTBidsForNFTPost = "/api/v0/get-nft-bids-for-nft-post";
  static RoutePathGetNFTsForUser = "/api/v0/get-nfts-for-user";
  static RoutePathGetNFTBidsForUser = "/api/v0/get-nft-bids-for-user";
  static RoutePathGetNFTShowcase = "/api/v0/get-nft-showcase";
  static RoutePathGetNextNFTShowcase = "/api/v0/get-next-nft-showcase";
  static RoutePathGetNFTCollectionSummary = "/api/v0/get-nft-collection-summary";
  static RoutePathGetNFTEntriesForPostHash = "/api/v0/get-nft-entries-for-nft-post";
  static RoutePathTransferNFT = "/api/v0/transfer-nft";
  static RoutePathAcceptNFTTransfer = "/api/v0/accept-nft-transfer";
  static RoutePathBurnNFT = "/api/v0/burn-nft";

  // ETH
  static RoutePathSubmitETHTx = "/api/v0/submit-eth-tx";
  static RoutePathQueryETHRPC = "/api/v0/query-eth-rpc";

  // Admin routes.
  static NodeControlRoute = "/api/v0/admin/node-control";
  static ReprocessBitcoinBlockRoute = "/api/v0/admin/reprocess-bitcoin-block";
  static RoutePathSwapIdentity = "/api/v0/admin/swap-identity";
  static RoutePathAdminUpdateUserGlobalMetadata = "/api/v0/admin/update-user-global-metadata";
  static RoutePathAdminGetAllUserGlobalMetadata = "/api/v0/admin/get-all-user-global-metadata";
  static RoutePathAdminGetUserGlobalMetadata = "/api/v0/admin/get-user-global-metadata";
  static RoutePathAdminUpdateGlobalFeed = "/api/v0/admin/update-global-feed";
  static RoutePathAdminPinPost = "/api/v0/admin/pin-post";
  static RoutePathAdminRemoveNilPosts = "/api/v0/admin/remove-nil-posts";
  static RoutePathAdminGetMempoolStats = "/api/v0/admin/get-mempool-stats";
  static RoutePathAdminGrantVerificationBadge = "/api/v0/admin/grant-verification-badge";
  static RoutePathAdminRemoveVerificationBadge = "/api/v0/admin/remove-verification-badge";
  static RoutePathAdminGetVerifiedUsers = "/api/v0/admin/get-verified-users";
  static RoutePathAdminGetUserAdminData = "/api/v0/admin/get-user-admin-data";
  static RoutePathAdminGetUsernameVerificationAuditLogs = "/api/v0/admin/get-username-verification-audit-logs";
  static RoutePathUpdateGlobalParams = "/api/v0/admin/update-global-params";
  static RoutePathSetUSDCentsToDeSoReserveExchangeRate = "/api/v0/admin/set-usd-cents-to-deso-reserve-exchange-rate";
  static RoutePathGetUSDCentsToDeSoReserveExchangeRate = "/api/v0/admin/get-usd-cents-to-deso-reserve-exchange-rate";
  static RoutePathSetBuyDeSoFeeBasisPoints = "/api/v0/admin/set-buy-deso-fee-basis-points";
  static RoutePathGetBuyDeSoFeeBasisPoints = "/api/v0/admin/get-buy-deso-fee-basis-points";
  static RoutePathAdminGetGlobalParams = "/api/v0/admin/get-global-params";
  static RoutePathGetGlobalParams = "/api/v0/get-global-params";
  static RoutePathEvictUnminedBitcoinTxns = "/api/v0/admin/evict-unmined-bitcoin-txns";
  static RoutePathGetWyreWalletOrdersForPublicKey = "/api/v0/admin/get-wyre-wallet-orders-for-public-key";
  static RoutePathAdminGetNFTDrop = "/api/v0/admin/get-nft-drop";
  static RoutePathAdminUpdateNFTDrop = "/api/v0/admin/update-nft-drop";
  static RoutePathAdminResetJumioForPublicKey = "/api/v0/admin/reset-jumio-for-public-key";
  static RoutePathAdminUpdateJumioDeSo = "/api/v0/admin/update-jumio-deso";
  static RoutePathAdminUpdateTutorialCreators = "/api/v0/admin/update-tutorial-creators";
  static RoutePathAdminResetTutorialStatus = "/api/v0/admin/reset-tutorial-status";
  static RoutePathAdminGetTutorialCreators = "/api/v0/admin/get-tutorial-creators";
  static RoutePathAdminJumioCallback = "/api/v0/admin/jumio-callback";
  static RoutePathAdminGetUnfilteredHotFeed = "/api/v0/admin/get-unfiltered-hot-feed";
  static RoutePathAdminGetHotFeedAlgorithm = "/api/v0/admin/get-hot-feed-algorithm";
  static RoutePathAdminUpdateHotFeedAlgorithm = "/api/v0/admin/update-hot-feed-algorithm";
  static RoutePathAdminUpdateHotFeedPostMultiplier = "/api/v0/admin/update-hot-feed-post-multiplier";
  static RoutePathAdminUpdateHotFeedUserMultiplier = "/api/v0/admin/update-hot-feed-user-multiplier";
  static RoutePathAdminGetHotFeedUserMultiplier = "/api/v0/admin/get-hot-feed-user-multiplier";

  // Referral program admin routes.
  static RoutePathAdminCreateReferralHash = "/api/v0/admin/create-referral-hash";
  static RoutePathAdminGetAllReferralInfoForUser = "/api/v0/admin/get-all-referral-info-for-user";
  static RoutePathAdminUpdateReferralHash = "/api/v0/admin/update-referral-hash";
  static RoutePathAdminDownloadReferralCSV = "/api/v0/admin/download-referral-csv";
  static RoutePathAdminDownloadRefereeCSV = "/api/v0/admin/download-referee-csv";
  static RoutePathAdminUploadReferralCSV = "/api/v0/admin/upload-referral-csv";

  // Referral program non-admin routes
  static RoutePathGetReferralInfoForUser = "/api/v0/get-referral-info-for-user";
  static RoutePathGetReferralInfoForReferralHash = "/api/v0/get-referral-info-for-referral-hash";

  static RoutePathGetFullTikTokURL = "/api/v0/get-full-tiktok-url";

  // Wyre routes.
  static RoutePathGetWyreWalletOrderQuotation = "/api/v0/get-wyre-wallet-order-quotation";
  static RoutePathGetWyreWalletOrderReservation = "/api/v0/get-wyre-wallet-order-reservation";

  // Associations
  static RoutePathCreateUserAssociation = "/api/v0/user-associations/create";
  static RoutePathCreatePostAssociation = "/api/v0/post-associations/create";
  static RoutePathDeletePostAssociation = "/api/v0/post-associations/delete";
  static RoutePathGetPostAssociations = "/api/v0/post-associations/query";
  static RoutePathGetPostAssociationCounts = "/api/v0/post-associations/counts";
}

export class Transaction {
  inputs: {
    txID: string;
    index: number;
  }[];
  outputs: {
    amountNanos: number;
    publicKeyBase58Check: string;
  }[];

  txnType: string;
  publicKeyBase58Check: string;
  signatureBytesHex: string;
}

export class ProfileEntryResponse {
  Username: string;
  Description: string;
  ProfilePic?: string;
  CoinEntry?: {
    DeSoLockedNanos: number;
    CoinWatermarkNanos: number;
    CoinsInCirculationNanos: number;
    CreatorBasisPoints: number;
  };
  CoinPriceDeSoNanos?: number;
  StakeMultipleBasisPoints?: number;
  PublicKeyBase58Check: string;
  UsersThatHODL?: any;
  Posts?: PostEntryResponse[];
  IsReserved?: boolean;
  IsVerified?: boolean;
  ExtraData?: {
    [key: string]: string;
  };
}

export enum TutorialStatus {
  EMPTY = "",
  STARTED = "TutorialStarted",
  SKIPPED = "TutorialSkipped",
  CREATE_PROFILE = "TutorialCreateProfileComplete",
  INVEST_OTHERS_BUY = "InvestInOthersBuyComplete",
  INVEST_OTHERS_SELL = "InvestInOthersSellComplete",
  INVEST_SELF = "InvestInYourselfComplete",
  FOLLOW_CREATORS = "FollowCreatorsComplete",
  DIAMOND = "GiveADiamondComplete",
  COMPLETE = "TutorialComplete",
}

export class GetSinglePostResponse {
  PostFound: PostEntryResponse;
}

export class PostEntryResponse {
  PostHashHex: string;
  PosterPublicKeyBase58Check: string;
  ParentStakeID: string;
  Body: string;
  RepostedPostHashHex: string;
  ImageURLs: string[];
  VideoURLs: string[];
  RepostPost: PostEntryResponse;
  CreatorBasisPoints: number;
  StakeMultipleBasisPoints: number;
  TimestampNanos: number;
  IsHidden: boolean;
  ConfirmationBlockHeight: number;
  // PostEntryResponse of the post that this post reposts.
  RepostedPostEntryResponse: PostEntryResponse;
  // The profile associated with this post.
  ProfileEntryResponse: ProfileEntryResponse;
  // The comments associated with this post.
  Comments: PostEntryResponse[];
  LikeCount: number;
  RepostCount: number;
  QuoteRepostCount: number;
  DiamondCount: number;
  // Information about the reader's state w/regard to this post (e.g. if they liked it).
  PostEntryReaderState?: PostEntryReaderState;
  // True if this post hash hex is in the global feed.
  InGlobalFeed: boolean;
  InHotFeed: boolean;
  CommentCount: number;
  // A list of parent posts for this post (ordered: root -> closest parent post).
  ParentPosts: PostEntryResponse[];
  InMempool: boolean;
  IsPinned: boolean;
  DiamondsFromSender?: number;
  NumNFTCopies: number;
  NumNFTCopiesForSale: number;
  NumNFTCopiesBurned?: number;
  HasUnlockable: boolean;
  IsNFT: boolean;
  NFTRoyaltyToCoinBasisPoints: number;
  NFTRoyaltyToCreatorBasisPoints: number;
  HotnessScore: number;
  PostMultiplier: number;
  PostExtraData: Record<string, any>;
  AdditionalDESORoyaltiesMap: { [k: string]: number };
  AdditionalCoinRoyaltiesMap: { [k: string]: number };
}

export class DiamondsPost {
  Post: PostEntryResponse;
  // Boolean that is set to true when this is the first post at a given diamond level.
  ShowDiamondDivider?: boolean;
}

export class PostEntryReaderState {
  // This is true if the reader has liked the associated post.
  LikedByReader?: boolean;

  // This is true if the reader has reposted the associated post.
  RepostedByReader?: boolean;

  // This is the post hash hex of the repost
  RepostPostHashHex?: string;

  // Level of diamond the user gave this post.
  DiamondLevelBestowed?: number;
}

export class PostTxnBody {
  Body?: string;
  ImageURLs?: string[];
  VideoURLs?: string[];
}

export class NFTEntryResponse {
  OwnerPublicKeyBase58Check: string;
  ProfileEntryResponse: ProfileEntryResponse | undefined;
  PostEntryResponse: PostEntryResponse | undefined;
  SerialNumber: number;
  IsForSale: boolean;
  IsPending?: boolean;
  IsBuyNow: boolean;
  MinBidAmountNanos: number;
  LastAcceptedBidAmountNanos: number;

  HighestBidAmountNanos: number;
  LowestBidAmountNanos: number;

  // only populated when the reader is the owner of the nft and there is an unlockable.
  LastOwnerPublicKeyBase58Check: string | undefined;
  EncryptedUnlockableText: string | undefined;
  DecryptedUnlockableText: string | undefined;
  BuyNowPriceNanos: number;
}

export class NFTBidEntryResponse {
  PublicKeyBase58Check: string;
  ProfileEntryResponse: ProfileEntryResponse;
  PostHashHex: string;
  PostEntryResponse: PostEntryResponse | undefined;
  SerialNumber: number;
  BidAmountNanos: number;

  HighestBidAmountNanos: number | undefined;
  LowestBidAmountNanos: number | undefined;

  BidderBalanceNanos: number;

  selected?: boolean;
  EarningsAmountNanos?: number;
}

export class NFTCollectionResponse {
  AvailableSerialNumbers: number[];
  PostEntryResponse: PostEntryResponse;
  ProfileEntryResponse: ProfileEntryResponse;
  NumCopiesForSale: number;
  HighestBidAmountNanos: number;
  LowestBidAmountNanos: number;
}

export class NFTBidData {
  PostEntryResponse: PostEntryResponse;
  NFTEntryResponses: NFTEntryResponse[];
  BidEntryResponses: NFTBidEntryResponse[];
}

export class DeSoNode {
  Name: string;
  URL: string;
  Owner: string;
}

type GetUserMetadataResponse = {
  HasPhoneNumber: boolean;
  CanCreateProfile: boolean;
  BlockedPubKeys: { [k: string]: any };
  HasEmail: boolean;
  EmailVerified: boolean;
  JumioFinishedTime: number;
  JumioVerified: boolean;
  JumioReturned: boolean;
};

type GetUsersStatelessResponse = {
  UserList: User[];
  DefaultFeeRateNanosPerKB: number;
  ParamUpdaters: { [k: string]: boolean };
};

type CountryLevelSignUpBonus = {
  AllowCustomReferralAmount: boolean;
  ReferralAmountOverrideUSDCents: number;
  AllowCustomKickbackAmount: boolean;
  KickbackAmountOverrideUSDCents: number;
};

export type MessagingGroupMember = {
  GroupMemberPublicKeyBase58Check: string;
  GroupMemberKeyName: string;
  EncryptedKey: string;
};

export type MessagingGroupEntryResponse = {
  GroupOwnerPublicKeyBase58Check: string;
  MessagingPublicKeyBase58Check: string;
  MessagingGroupKeyName: string;
  MessagingGroupMembers: MessagingGroupMember[];
  EncryptedKey: string;
  ExtraData: { [k: string]: string };
};

export type GetAllMessagingGroupKeysResponse = {
  MessagingGroupEntries: MessagingGroupEntryResponse[];
};

export type MessagingGroupMemberResponse = {
  // GroupMemberPublicKeyBase58Check is the main public key of the group member.
  GroupMemberPublicKeyBase58Check: string;

  // GroupMemberKeyName is the key name of the member that we encrypt the group messaging public key to. The group
  // messaging public key should not be confused with the GroupMemberPublicKeyBase58Check, the former is the public
  // key of the whole group, while the latter is the public key of the group member.
  GroupMemberKeyName: string;

  // EncryptedKey is the encrypted private key corresponding to the group messaging public key that's encrypted
  // to the member's registered messaging key labeled with GroupMemberKeyName.
  EncryptedKey: string;
};

export enum AssociationType {
  // TODO: add more types when needed
  reaction = "REACTION",
}

export enum AssociationReactionValue {
  LIKE = "LIKE",
  DISLIKE = "DISLIKE",
  LOVE = "LOVE",
  LAUGH = "LAUGH",
  ASTONISHED = "ASTONISHED",
  SAD = "SAD",
  ANGRY = "ANGRY",
}

// TODO: other association values can be added as Value1 | Value2 etc.
export type AssociationValue = AssociationReactionValue;

export interface PostAssociation {
  AppPublicKeyBase58Check: string;
  AssociationID: string;
  AssociationType: AssociationType;
  AssociationValue: AssociationValue;
  BlockHeight: number;
  ExtraData: any;
  PostHashHex: string;
  TransactorPublicKeyBase58Check: string;
}

export interface PostAssociationCountsResponse {
  Counts: { [key in AssociationValue]?: number };
  Total: number;
}

export interface PostAssociationsResponse {
  Associations: Array<PostAssociation>;
}

@Injectable({
  providedIn: "root",
})
export class BackendApiService {
  constructor(private httpClient: HttpClient, private identityService: IdentityService) {}

  static GET_PROFILES_ORDER_BY_INFLUENCER_COIN_PRICE = "influencer_coin_price";
  static BUY_CREATOR_COIN_OPERATION_TYPE = "buy";
  static SELL_CREATOR_COIN_OPERATION_TYPE = "sell";
  static DIAMOND_APP_PUBLIC_KEY = "BC1YLgTKfwSeHuNWtuqQmwduJM2QZ7ZQ9C7HFuLpyXuunUN7zTEr5WL";

  // TODO: Cleanup - this should be a configurable value on the node. Leaving it in the frontend
  // is fine for now because BlockCypher has strong anti-abuse measures in place.
  blockCypherToken = "cd455c8a5d404bb0a23880b72f56aa86";

  // Store sent messages and associated metadata in localStorage
  MessageMetaKey = "messageMetaKey";

  // Store the identity users in localStorage
  IdentityUsersKey = "identityUsers";

  // Store last local node URL in localStorage
  LastLocalNodeKey = "lastLocalNodeV2";

  // Store last logged in user public key in localStorage
  LastLoggedInUserKey = "lastLoggedInUser";

  // Store the last identity service URL in localStorage
  LastIdentityServiceKey = "lastIdentityServiceURL";

  // Messaging V3 default key name.
  DefaultKey = "default-key";

  // Store whether user has dismissed email notifications in localStorage
  EmailNotificationsDismissalKey = "emailNotificationsDismissedAt";

  // TODO: Wipe all this data when transition is complete
  LegacyUserListKey = "userList";
  LegacySeedListKey = "seedList";

  SetStorage(key: string, value: any) {
    localStorage.setItem(key, value || value === false ? JSON.stringify(value) : "");
  }

  RemoveStorage(key: string) {
    localStorage.removeItem(key);
  }

  GetStorage(key: string) {
    const data = localStorage.getItem(key);
    if (data === "") {
      return null;
    }

    return JSON.parse(data);
  }

  SetEncryptedMessagingKeyRandomnessForPublicKey(
    publicKeyBase58Check: string,
    encryptedMessagingKeyRandomness: string
  ): void {
    const users = this.GetStorage(this.IdentityUsersKey);
    this.setIdentityServiceUsers({
      ...users,
      [publicKeyBase58Check]: {
        ...users[publicKeyBase58Check],
        encryptedMessagingKeyRandomness,
      },
    });
  }

  // Assemble a URL to hit the BE with.
  _makeRequestURL(endpoint: string, routeName: string, adminPublicKey?: string): string {
    let queryURL = location.protocol + "//" + endpoint + routeName;
    // If the protocol is specified within the endpoint then use that.
    if (endpoint.startsWith("http")) {
      queryURL = endpoint + routeName;
    }
    if (adminPublicKey) {
      queryURL += `?admin_public_key=${adminPublicKey}`;
    }
    return queryURL;
  }

  _handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error("An error occurred:", error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(`Backend returned code ${error.status}, ` + `body was: ${JSON.stringify(error.error)}`);
    }
    // return an observable with a user-facing error message
    return throwError(error);
  }

  // Stores identity service users in identityService and localStorage
  // TODO: remove this since we don't really it... we can just use the identityService
  setIdentityServiceUsers(users: any, publicKeyAdded?: string) {
    this.SetStorage(this.IdentityUsersKey, users);
    this.identityService.identityServiceUsers = users;
    this.identityService.identityServicePublicKeyAdded = publicKeyAdded;
  }

  signAndSubmitTransaction(endpoint: string, request: Observable<any>, PublicKeyBase58Check: string): Observable<any> {
    return request
      .pipe(
        switchMap((res) =>
          this.identityService
            .sign({
              transactionHex: res.TransactionHex,
              ...this.identityService.identityServiceParamsForKey(PublicKeyBase58Check),
            })
            .pipe(
              switchMap((signed) => {
                if (signed.approvalRequired) {
                  return this.identityService
                    .launch("/approve", {
                      tx: res.TransactionHex,
                    })
                    .pipe(
                      map((approved) => {
                        this.setIdentityServiceUsers(approved.users);
                        return { ...res, ...approved };
                      })
                    );
                } else {
                  return of({ ...res, ...signed });
                }
              })
            )
        )
      )
      .pipe(
        switchMap((res) =>
          this.SubmitTransaction(endpoint, res.signedTransactionHex).pipe(
            map((broadcasted) => ({ ...res, ...broadcasted }))
          )
        )
      )
      .pipe(catchError(this._handleError));
  }

  get(endpoint: string, path: string) {
    return this.httpClient.get<any>(this._makeRequestURL(endpoint, path)).pipe(catchError(this._handleError));
  }

  post(endpoint: string, path: string, body: any): Observable<any> {
    return this.httpClient.post<any>(this._makeRequestURL(endpoint, path), body).pipe(catchError(this._handleError));
  }

  jwtPost(endpoint: string, path: string, publicKey: string, body: any): Observable<any> {
    const promise = identity.jwt();
    return from(promise).pipe(switchMap((JWT) => this.post(endpoint, path, { JWT, ...body })));
  }

  GetExchangeRate(): Observable<GetExchangeRateResponse> {
    return from(getExchangeRates());
  }

  GetBlockTemplate(PublicKeyBase58Check: string): Observable<GetBlockTemplateResponse> {
    return from(
      getBlockTemplate({
        PublicKeyBase58Check,
        NumHeaders: 0,
        HeaderVersion: 1,
      })
    );
  }

  GetTxn(TxnHashHex: string): Observable<GetTxnResponse> {
    return from(getTransaction({ TxnHashHex }));
  }

  // TODO: do we need this?
  DeleteIdentities(endpoint: string): Observable<any> {
    return this.httpClient
      .post<any>(this._makeRequestURL(endpoint, BackendRoutes.RoutePathDeleteIdentities), {}, { withCredentials: true })
      .pipe(catchError(this._handleError));
  }

  SendDeSoPreview(
    SenderPublicKeyBase58Check: string,
    RecipientPublicKeyOrUsername: string,
    AmountNanos: number
  ): Observable<SendDeSoResponse> {
    return from(
      sendDeso(
        {
          SenderPublicKeyBase58Check,
          RecipientPublicKeyOrUsername,
          AmountNanos,
        },
        { broadcast: false }
      ).then((res) => res.constructedTransactionResponse)
    );
  }

  SendDeSo(
    SenderPublicKeyBase58Check: string,
    RecipientPublicKeyOrUsername: string,
    AmountNanos: number
  ): Observable<SendDeSoResponse & SubmitTransactionResponse> {
    return from(
      sendDeso({
        SenderPublicKeyBase58Check,
        RecipientPublicKeyOrUsername,
        AmountNanos,
      }).then((res) => ({ ...res.constructedTransactionResponse, ...res.submittedTransactionResponse }))
    );
  }

  SubmitTransaction(endpoint: string, TransactionHex: string): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathSubmitTransaction, {
      TransactionHex,
    });
  }

  // TODO: migrate this to the new api
  SendMessage(
    endpoint: string,
    SenderPublicKeyBase58Check: string,
    RecipientPublicKeyBase58Check: string,
    MessageText: string,
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    // First check if either sender or recipient has registered the "default-key" messaging group key.
    // In V3 messages, we expect users to migrate to the V3 messages, which means they'll have the default
    // key registered on-chain. We want to automatically send messages to this default key is it's registered.
    // To check the messaging key we call the RoutePathCheckPartyMessaging keys backend API route.
    let req = this.post(endpoint, BackendRoutes.RoutePathCheckPartyMessagingKeys, {
      SenderPublicKeyBase58Check,
      SenderMessagingKeyName: this.DefaultKey,
      RecipientPublicKeyBase58Check,
      RecipientMessagingKeyName: this.DefaultKey,
    })
      .pipe(
        switchMap((partyMessagingKeys) => {
          // Once we determine the messaging keys of the parties, we will then encrypt a message based on the keys.
          const callEncrypt$ = (encryptedMessagingKeyRandomness?: string) => {
            let payload = {
              ...this.identityService.identityServiceParamsForKey(SenderPublicKeyBase58Check),
              recipientPublicKey: partyMessagingKeys.RecipientMessagingPublicKeyBase58Check,
              senderGroupKeyName: partyMessagingKeys.SenderMessagingKeyName,
              message: MessageText,
            };
            if (encryptedMessagingKeyRandomness) {
              payload = { ...payload, encryptedMessagingKeyRandomness };
            }
            return this.identityService.encrypt(payload);
          };

          const callRegisterGroupMessagingKey$ = (res: {
            messagingPublicKeyBase58Check: string;
            messagingKeySignature: string;
          }) => {
            return this.RegisterGroupMessagingKey(
              endpoint,
              SenderPublicKeyBase58Check,
              res.messagingPublicKeyBase58Check,
              "default-key",
              res.messagingKeySignature,
              [],
              {},
              MinFeeRateNanosPerKB
            );
          };

          const launchDefaultMessagingKey$ = () =>
            from(
              SwalHelper.fire({
                html:
                  "In order to use the latest messaging features, you need to create a default messaging key. DeSo Identity will now launch to generate this key for you.",
                showCancelButton: false,
              })
            ).pipe(
              switchMap((res) => {
                if (res.isConfirmed) {
                  return this.identityService
                    .launchDefaultMessagingKey(SenderPublicKeyBase58Check)
                    .pipe(timeout(45000));
                } else {
                  throwError("Default Messaging Key required to encrypt messages");
                }
              })
            );

          const submitEncryptedMessage$ = (encrypted: any) => {
            // Now we will use the ciphertext encrypted to user's messaging keys as part of the metadata of the
            // sendMessage transaction.
            const EncryptedMessageText = encrypted.encryptedMessage;
            // Determine whether to use V3 messaging group key names for sender or recipient.
            const senderV3 = partyMessagingKeys.IsSenderMessagingKey;
            const SenderMessagingGroupKeyName = senderV3 ? partyMessagingKeys.SenderMessagingKeyName : "";
            const recipientV3 = partyMessagingKeys.IsRecipientMessagingKey;
            const RecipientMessagingGroupKeyName = recipientV3 ? partyMessagingKeys.RecipientMessagingKeyName : "";
            return this.post(endpoint, BackendRoutes.RoutePathSendMessageStateless, {
              SenderPublicKeyBase58Check,
              RecipientPublicKeyBase58Check,
              EncryptedMessageText,
              SenderMessagingGroupKeyName,
              RecipientMessagingGroupKeyName,
              MinFeeRateNanosPerKB,
            }).pipe(
              map((request) => {
                return { ...request };
              })
            );
          };
          // call encrypt and see what happens
          return callEncrypt$().pipe(
            switchMap((res: any) => {
              // Verify we have the messaging key
              return of({
                isMissingRandomness: res?.encryptedMessage === "" && res?.requiresEncryptedMessagingKeyRandomness,
                res,
              });
            }),
            switchMap(({ isMissingRandomness, res }) => {
              if (!isMissingRandomness) {
                // easy pz return early
                return submitEncryptedMessage$(res);
              }
              // otherwise, launch
              return launchDefaultMessagingKey$().pipe(
                switchMap((res) => {
                  if (!res.encryptedMessagingKeyRandomness) {
                    return throwError("Error getting encrypted messaging key randomness");
                  }
                  this.SetEncryptedMessagingKeyRandomnessForPublicKey(
                    SenderPublicKeyBase58Check,
                    res.encryptedMessagingKeyRandomness
                  );
                  return this.GetDefaultKey(endpoint, SenderPublicKeyBase58Check).pipe(
                    switchMap((defaultKey) => {
                      return of({ defaultKey, res });
                    }),
                    switchMap(({ defaultKey, res }) => {
                      return !defaultKey
                        ? callRegisterGroupMessagingKey$(res).pipe(
                            switchMap((groupMessagingKeyResponse) => {
                              if (!groupMessagingKeyResponse) {
                                throwError("Error creating default key");
                              }
                              return of(res);
                            })
                          )
                        : of(res);
                    }),
                    switchMap((_) => {
                      partyMessagingKeys.SenderMessagingKeyName = "default-key";
                      partyMessagingKeys.IsSenderMessagingKey = true;
                      return callEncrypt$().pipe(
                        switchMap((res) => {
                          if (res?.encryptedMessage && !res?.requiresEncryptedMessagingKeyRandomness) {
                            return submitEncryptedMessage$(res.encryptedMessage);
                          }
                          return throwError("Error submitting messaging");
                        })
                      );
                    })
                  );
                })
              );
            })
          );
        })
      )
      .pipe(catchError(this._handleError));
    return this.signAndSubmitTransaction(endpoint, req, SenderPublicKeyBase58Check);
  }

  // TODO: this should go away once we refactor to all the new stuff.
  RegisterGroupMessagingKey(
    endpoint: string,
    OwnerPublicKeyBase58Check: string,
    MessagingPublicKeyBase58Check: string,
    MessagingGroupKeyName: string,
    MessagingKeySignatureHex: string,
    MessagingGroupMembers: MessagingGroupMemberResponse[],
    ExtraData: { [k: string]: string },
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    const request = this.post(endpoint, BackendRoutes.RegisterGroupMessagingKey, {
      OwnerPublicKeyBase58Check,
      MessagingPublicKeyBase58Check,
      MessagingGroupKeyName,
      MessagingKeySignatureHex,
      MessagingGroupMembers,
      ExtraData,
      MinFeeRateNanosPerKB,
    });
    return this.signAndSubmitTransaction(endpoint, request, OwnerPublicKeyBase58Check);
  }

  // User-related functions.
  GetUsersStateless(
    PublicKeysBase58Check: string[],
    SkipForLeaderboard: boolean = false
  ): Observable<GetUsersStatelessResponse> {
    return from(
      getUsersStateless({
        PublicKeysBase58Check,
        SkipForLeaderboard,
      })
    );
  }

  // TODO: figure out the best way to deal with this...
  // Do we need *another* api client for uploading images?
  // we could also temporarily configure the nodeURI and then set it back which seems fine as well.
  UploadImage(endpoint: string, UserPublicKeyBase58Check: string, file: File): Observable<any> {
    const request = this.identityService.jwt({
      ...this.identityService.identityServiceParamsForKey(UserPublicKeyBase58Check),
    });
    return request.pipe(
      switchMap((signed) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("UserPublicKeyBase58Check", UserPublicKeyBase58Check);
        formData.append("JWT", signed.jwt);

        return this.post(endpoint, BackendRoutes.RoutePathUploadImage, formData);
      })
    );
  }

  // TODO: figure this out too. this is using the media client though.
  UploadVideo(
    endpoint: string,
    file: File,
    publicKeyBase58Check: string
  ): Observable<{
    tusEndpoint: string;
    asset: {
      id: string;
      playbackId: string;
    };
  }> {
    const request = this.identityService.jwt({
      ...this.identityService.identityServiceParamsForKey(publicKeyBase58Check),
    });
    return request.pipe(
      switchMap((signed) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("UserPublicKeyBase58Check", publicKeyBase58Check);
        formData.append("JWT", signed.jwt);

        return this.post(endpoint, BackendRoutes.RoutePathUploadVideo, formData);
      })
    );
  }

  CreateNft(
    UpdaterPublicKeyBase58Check: string,
    NFTPostHashHex: string,
    NumCopies: number,
    NFTRoyaltyToCreatorBasisPoints: number,
    NFTRoyaltyToCoinBasisPoints: number,
    HasUnlockable: boolean,
    IsForSale: boolean,
    MinBidAmountNanos: number,
    IsBuyNow: boolean,
    BuyNowPriceNanos: number,
    AdditionalDESORoyaltiesMap: { [k: string]: number },
    AdditionalCoinRoyaltiesMap: { [k: string]: number }
  ): Observable<any> {
    return from(
      createNFT({
        UpdaterPublicKeyBase58Check,
        NFTPostHashHex,
        NumCopies,
        NFTRoyaltyToCreatorBasisPoints,
        NFTRoyaltyToCoinBasisPoints,
        HasUnlockable,
        IsForSale,
        MinBidAmountNanos,
        IsBuyNow,
        BuyNowPriceNanos,
        AdditionalDESORoyaltiesMap,
        AdditionalCoinRoyaltiesMap,
      })
    );
  }

  UpdateNFT(
    UpdaterPublicKeyBase58Check: string,
    NFTPostHashHex: string,
    SerialNumber: number,
    IsForSale: boolean,
    MinBidAmountNanos: number,
    IsBuyNow: boolean,
    BuyNowPriceNanos: number
  ): Observable<any> {
    return from(
      updateNFT({
        UpdaterPublicKeyBase58Check,
        NFTPostHashHex,
        SerialNumber,
        IsForSale,
        MinBidAmountNanos,
        IsBuyNow,
        BuyNowPriceNanos,
      })
    );
  }

  CreateNFTBid(
    UpdaterPublicKeyBase58Check: string,
    NFTPostHashHex: string,
    SerialNumber: number,
    BidAmountNanos: number
  ): Observable<any> {
    return from(
      createNFTBid({
        UpdaterPublicKeyBase58Check,
        NFTPostHashHex,
        SerialNumber,
        BidAmountNanos,
      })
    );
  }

  BurnNFT(UpdaterPublicKeyBase58Check: string, NFTPostHashHex: string, SerialNumber: number): Observable<any> {
    return from(
      burnNFT({
        UpdaterPublicKeyBase58Check,
        NFTPostHashHex,
        SerialNumber,
      })
    );
  }

  AcceptNFTTransfer(
    UpdaterPublicKeyBase58Check: string,
    NFTPostHashHex: string,
    SerialNumber: number
  ): Observable<any> {
    return from(
      acceptNFTTransfer({
        UpdaterPublicKeyBase58Check,
        NFTPostHashHex,
        SerialNumber,
      })
    );
  }

  // TODO: make sure our encrypt/decrypt stuff works right here. I think we'll need to make sure we're using the
  // derived messaging keys for encrypt and decrypt.
  AcceptNFTBid(
    endpoint: string,
    UpdaterPublicKeyBase58Check: string,
    NFTPostHashHex: string,
    SerialNumber: number,
    BidderPublicKeyBase58Check: string,
    BidAmountNanos: number,
    UnencryptedUnlockableText: string,
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    let request = UnencryptedUnlockableText
      ? this.identityService.encrypt({
          ...this.identityService.identityServiceParamsForKey(UpdaterPublicKeyBase58Check),
          recipientPublicKey: BidderPublicKeyBase58Check,
          senderGroupKeyName: "",
          message: UnencryptedUnlockableText,
        })
      : of({ encryptedMessage: "" });
    request = request.pipe(
      switchMap((encrypted) => {
        const EncryptedMessageText = encrypted.encryptedMessage;
        return this.post(endpoint, BackendRoutes.RoutePathAcceptNFTBid, {
          UpdaterPublicKeyBase58Check,
          NFTPostHashHex,
          SerialNumber,
          BidderPublicKeyBase58Check,
          BidAmountNanos,
          EncryptedUnlockableText: EncryptedMessageText,
          MinFeeRateNanosPerKB,
        }).pipe(
          map((request) => {
            return { ...request };
          })
        );
      })
    );
    return this.signAndSubmitTransaction(endpoint, request, UpdaterPublicKeyBase58Check);
  }

  // TODO: make sure our encrypt/decrypt stuff works right here. I think we'll need to make sure we're using the
  // derived messaging keys for encrypt and decrypt.
  DecryptUnlockableTexts(
    ReaderPublicKeyBase58Check: string,
    UnlockableNFTEntryResponses: NFTEntryResponse[]
  ): Observable<any> {
    return this.identityService
      .decrypt({
        ...this.identityService.identityServiceParamsForKey(ReaderPublicKeyBase58Check),
        encryptedMessages: UnlockableNFTEntryResponses.map((unlockableNFTEntryResponses) => ({
          EncryptedHex: unlockableNFTEntryResponses.EncryptedUnlockableText,
          PublicKey: unlockableNFTEntryResponses.LastOwnerPublicKeyBase58Check,
        })),
      })
      .pipe(
        map((decrypted) => {
          for (const unlockableNFTEntryResponse of UnlockableNFTEntryResponses) {
            unlockableNFTEntryResponse.DecryptedUnlockableText =
              decrypted.decryptedHexes[unlockableNFTEntryResponse.EncryptedUnlockableText];
          }
          return UnlockableNFTEntryResponses;
        })
      )
      .pipe(catchError(this._handleError));
  }

  // TODO: use new lib for this.
  GetNFTBidsForNFTPost(
    endpoint: string,
    ReaderPublicKeyBase58Check: string,
    PostHashHex: string
  ): Observable<NFTBidData> {
    return this.post(endpoint, BackendRoutes.RoutePathGetNFTBidsForNFTPost, {
      ReaderPublicKeyBase58Check,
      PostHashHex,
    });
  }

  GetNFTsForUser(
    UserPublicKeyBase58Check: string,
    ReaderPublicKeyBase58Check: string,
    IsForSale: boolean | null = null,
    IsPending: boolean | null = null
  ): Observable<any> {
    return from(
      getNFTsForUser({
        UserPublicKeyBase58Check,
        ReaderPublicKeyBase58Check,
        IsForSale,
        IsPending,
      })
    );
  }

  GetNFTBidsForUser(UserPublicKeyBase58Check: string, ReaderPublicKeyBase58Check: string): Observable<any> {
    return from(
      getNFTBidsForUser({
        UserPublicKeyBase58Check,
        ReaderPublicKeyBase58Check,
      })
    );
  }

  GetNFTCollectionSummary(endpoint: string, ReaderPublicKeyBase58Check: string, PostHashHex: string): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathGetNFTCollectionSummary, {
      ReaderPublicKeyBase58Check,
      PostHashHex,
    });
  }

  GetNFTEntriesForNFTPost(ReaderPublicKeyBase58Check: string, PostHashHex: string): Observable<any> {
    return from(
      getNFTCollectionSummary({
        ReaderPublicKeyBase58Check,
        PostHashHex,
      })
    );
  }

  GetNFTShowcase(ReaderPublicKeyBase58Check: string): Observable<any> {
    return from(
      getNFTShowcase({
        ReaderPublicKeyBase58Check,
      })
    );
  }

  // TODO: make sure our encrypt/decrypt stuff works right here.
  TransferNFT(
    endpoint: string,
    SenderPublicKeyBase58Check: string,
    ReceiverPublicKeyBase58Check: string,
    NFTPostHashHex: string,
    SerialNumber: number,
    UnencryptedUnlockableText: string,
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    let request = UnencryptedUnlockableText
      ? this.identityService.encrypt({
          ...this.identityService.identityServiceParamsForKey(SenderPublicKeyBase58Check),
          recipientPublicKey: ReceiverPublicKeyBase58Check,
          senderGroupKeyName: "",
          message: UnencryptedUnlockableText,
        })
      : of({ encryptedMessage: "" });
    request = request.pipe(
      switchMap((encrypted) => {
        const EncryptedUnlockableText = encrypted.encryptedMessage;
        return this.post(endpoint, BackendRoutes.RoutePathTransferNFT, {
          SenderPublicKeyBase58Check,
          ReceiverPublicKeyBase58Check,
          NFTPostHashHex,
          SerialNumber,
          EncryptedUnlockableText,
          MinFeeRateNanosPerKB,
        }).pipe(
          map((request) => {
            return { ...request };
          })
        );
      })
    );

    return this.signAndSubmitTransaction(endpoint, request, SenderPublicKeyBase58Check);
  }

  SubmitPost(
    UpdaterPublicKeyBase58Check: string,
    PostHashHexToModify: string,
    ParentStakeID: string,
    BodyObj: DeSoBodySchema,
    RepostedPostHashHex: string,
    PostExtraData: any,
    IsHidden: boolean
  ): Observable<any> {
    return from(
      submitPost({
        UpdaterPublicKeyBase58Check,
        PostHashHexToModify,
        ParentStakeID,
        BodyObj,
        RepostedPostHashHex,
        PostExtraData,
        IsHidden,
      })
    );
  }

  GetPostsStateless(
    PostHashHex: string,
    ReaderPublicKeyBase58Check: string,
    OrderBy: string,
    StartTstampSecs: number,
    PostContent: string,
    NumToFetch: number,
    FetchSubcomments: boolean,
    GetPostsForFollowFeed: boolean,
    GetPostsForGlobalWhitelist: boolean,
    GetPostsByDESO: boolean,
    MediaRequired: boolean,
    PostsByDESOMinutesLookback: number,
    AddGlobalFeedBool: boolean
  ): Observable<any> {
    return from(
      getPostsStateless({
        PostHashHex,
        ReaderPublicKeyBase58Check,
        OrderBy,
        StartTstampSecs,
        PostContent,
        NumToFetch,
        FetchSubcomments,
        GetPostsForFollowFeed,
        GetPostsForGlobalWhitelist,
        GetPostsByDESO,
        MediaRequired,
        PostsByDESOMinutesLookback,
        AddGlobalFeedBool,
      })
    );
  }

  GetHotFeed(ReaderPublicKeyBase58Check: string, SeenPosts, ResponseLimit, Tag?: string): Observable<any> {
    return from(
      getHotFeed({
        ReaderPublicKeyBase58Check,
        SeenPosts,
        ResponseLimit,
        SortByNew: false,
        Tag,
      })
    );
  }

  GetSinglePost(
    PostHashHex: string,
    ReaderPublicKeyBase58Check: string,
    FetchParents: boolean = true,
    CommentOffset: number = 0,
    CommentLimit: number = 20,
    AddGlobalFeedBool: boolean = false,
    ThreadLevelLimit: number | undefined = undefined,
    ThreadLeafLimit: number | undefined = undefined,
    LoadAuthorThread: boolean | undefined = undefined
  ): Observable<any> {
    return from(
      getSinglePost({
        PostHashHex,
        ReaderPublicKeyBase58Check,
        FetchParents,
        CommentOffset,
        CommentLimit,
        AddGlobalFeedBool,
        ThreadLevelLimit,
        ThreadLeafLimit,
        LoadAuthorThread,
      })
    );
  }

  GetProfiles(
    PublicKeyBase58Check: string,
    Username: string,
    UsernamePrefix: string,
    Description: string,
    OrderBy: string,
    NumToFetch: number,
    ReaderPublicKeyBase58Check: string,
    ModerationType: string,
    FetchUsersThatHODL: boolean,
    AddGlobalFeedBool: boolean = false
  ): Observable<any> {
    return from(
      getProfiles({
        PublicKeyBase58Check,
        Username,
        UsernamePrefix,
        Description,
        OrderBy,
        NumToFetch,
        ReaderPublicKeyBase58Check,
        ModerationType,
        FetchUsersThatHODL,
        AddGlobalFeedBool,
      })
    );
  }

  GetSingleProfile(PublicKeyBase58Check: string, Username: string, NoErrorOnMissing: boolean = false): Observable<any> {
    return from(
      getSingleProfile({
        PublicKeyBase58Check,
        Username,
        NoErrorOnMissing,
      })
    );
  }

  GetSingleProfilePicture(PublicKeyBase58Check: string): Observable<Blob> {
    return this.httpClient.get(this.GetSingleProfilePictureURL(PublicKeyBase58Check), {
      responseType: "blob",
    });
  }

  GetSingleProfilePictureURL(PublicKeyBase58Check?: string): string {
    return buildProfilePictureUrl(PublicKeyBase58Check, {
      fallbackImageUrl: `${window.location.origin}/assets/img/default-profile-pic.png`,
    });
  }

  GetPostsForPublicKey(
    PublicKeyBase58Check: string,
    Username: string,
    ReaderPublicKeyBase58Check: string,
    LastPostHashHex: string,
    NumToFetch: number,
    MediaRequired: boolean
  ): Observable<any> {
    return from(
      getPostsForUser({
        PublicKeyBase58Check,
        Username,
        ReaderPublicKeyBase58Check,
        LastPostHashHex,
        NumToFetch,
        MediaRequired,
      })
    );
  }

  GetDiamondedPosts(
    ReceiverPublicKeyBase58Check: string,
    ReceiverUsername: string,
    SenderPublicKeyBase58Check: string,
    SenderUsername: string,
    ReaderPublicKeyBase58Check: string,
    StartPostHashHex: string,
    NumToFetch: number
  ): Observable<any> {
    return from(
      getDiamondedPosts({
        ReceiverPublicKeyBase58Check,
        ReceiverUsername,
        SenderPublicKeyBase58Check,
        SenderUsername,
        ReaderPublicKeyBase58Check,
        StartPostHashHex,
        NumToFetch,
      })
    );
  }

  GetHodlersForPublicKey(
    PublicKeyBase58Check: string,
    Username: string,
    LastPublicKeyBase58Check: string,
    NumToFetch: number,
    FetchHodlings: boolean = false,
    FetchAll: boolean = false
  ): Observable<any> {
    return from(
      getHodlersForUser({
        PublicKeyBase58Check,
        Username,
        LastPublicKeyBase58Check,
        NumToFetch,
        FetchHodlings,
        FetchAll,
      })
    );
  }

  UpdateProfile(
    // Specific fields
    UpdaterPublicKeyBase58Check: string,
    // Optional: Only needed when updater public key != profile public key
    ProfilePublicKeyBase58Check: string,
    NewUsername: string,
    NewDescription: string,
    NewProfilePic: string,
    NewCreatorBasisPoints: number,
    NewStakeMultipleBasisPoints: number,
    IsHidden: boolean,
    // End specific fields
    ExtraData: {
      [key: string]: string;
    } = {}
  ): Observable<any> {
    NewCreatorBasisPoints = Math.floor(NewCreatorBasisPoints);
    NewStakeMultipleBasisPoints = Math.floor(NewStakeMultipleBasisPoints);

    return from(
      updateProfile({
        UpdaterPublicKeyBase58Check,
        ProfilePublicKeyBase58Check,
        NewUsername,
        NewDescription,
        NewProfilePic,
        NewCreatorBasisPoints,
        NewStakeMultipleBasisPoints,
        IsHidden,
        ExtraData,
      })
    ).pipe(map(mergeTxResponse));
  }

  GetFollows(
    Username: string,
    PublicKeyBase58Check: string,
    GetEntriesFollowingUsername: boolean,
    LastPublicKeyBase58Check: string = "",
    NumToFetch: number = 50
  ): Observable<any> {
    return from(
      getFollowersForUser({
        Username,
        PublicKeyBase58Check,
        GetEntriesFollowingUsername,
        LastPublicKeyBase58Check,
        NumToFetch,
      })
    );
  }

  CreateFollowTxn(
    FollowerPublicKeyBase58Check: string,
    FollowedPublicKeyBase58Check: string,
    IsUnfollow: boolean
  ): Observable<any> {
    return from(
      updateFollowingStatus({
        FollowerPublicKeyBase58Check,
        FollowedPublicKeyBase58Check,
        IsUnfollow,
      })
    ).pipe(map(mergeTxResponse));
  }

  // TODO: convert to the new messaging thing
  GetMessages(
    endpoint: string,
    PublicKeyBase58Check: string,
    FetchAfterPublicKeyBase58Check: string = "",
    NumToFetch: number = 25,
    HoldersOnly: boolean = false,
    HoldingsOnly: boolean = false,
    FollowersOnly: boolean = false,
    FollowingOnly: boolean = false,
    SortAlgorithm: string = "time",
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    let req = this.httpClient.post<any>(this._makeRequestURL(endpoint, BackendRoutes.RoutePathGetMessagesStateless), {
      PublicKeyBase58Check,
      FetchAfterPublicKeyBase58Check,
      NumToFetch,
      HoldersOnly,
      HoldingsOnly,
      FollowersOnly,
      FollowingOnly,
      SortAlgorithm,
    });
    // create an array of messages to decrypt
    req = req.pipe(
      map((res) => {
        // This array contains encrypted messages with public keys
        // Public keys of the other party involved in the correspondence
        const encryptedMessages = res.OrderedContactsWithMessages.flatMap((thread) =>
          thread.Messages.flatMap((message) => ({
            EncryptedHex: message.EncryptedText,
            PublicKey: message.IsSender ? message.RecipientPublicKeyBase58Check : message.SenderPublicKeyBase58Check,
            IsSender: message.IsSender,
            Legacy: !message.V2 && (!message.Version || message.Version < 2),
            Version: message.Version,
            SenderMessagingPublicKey: message.SenderMessagingPublicKey,
            SenderMessagingGroupKeyName: message.SenderMessagingGroupKeyName,
            RecipientMessagingPublicKey: message.RecipientMessagingPublicKey,
            RecipientMessagingGroupKeyName: message.RecipientMessagingGroupKeyName,
          }))
        );
        return { ...res, encryptedMessages };
      })
    );
    const launchDefaultMessagingKey$ = () =>
      from(
        SwalHelper.fire({
          html:
            "In order to use the latest messaging features, you need to create a default messaging key. DeSo Identity will now launch to generate this key for you.",
          showCancelButton: false,
        })
      ).pipe(
        switchMap((res) => {
          if (res.isConfirmed) {
            return this.identityService.launchDefaultMessagingKey(PublicKeyBase58Check).pipe(timeout(45000));
          } else {
            throwError("Default Messaging Key required to encrypt messages");
          }
        })
      );

    const callRegisterGroupMessagingKey$ = (res: {
      messagingPublicKeyBase58Check: string;
      messagingKeySignature: string;
    }) => {
      return this.RegisterGroupMessagingKey(
        endpoint,
        PublicKeyBase58Check,
        res.messagingPublicKeyBase58Check,
        "default-key",
        res.messagingKeySignature,
        [],
        {},
        MinFeeRateNanosPerKB
      );
    };

    const addDecryptedMessagesToMessagePayload = (res, decryptedHexes, wrap) => {
      res.OrderedContactsWithMessages.forEach((threads) =>
        threads.Messages.forEach((message) => {
          message.DecryptedText = decryptedHexes.decryptedHexes[message.EncryptedText];
        })
      );
      return wrap ? of({ ...res, ...decryptedHexes }) : { ...res, ...decryptedHexes };
    };

    // decrypt all the messages
    req = req
      .pipe(
        switchMap((res) => {
          return this.identityService
            .decrypt({
              ...this.identityService.identityServiceParamsForKey(PublicKeyBase58Check),
              encryptedMessages: res.encryptedMessages,
              // encryptedMessagingKeyRandomness: undefined, // useful for testing with key / without key flows
            })
            .pipe(
              map((decryptedResponse) => {
                if (decryptedResponse?.requiresEncryptedMessagingKeyRandomness === true) {
                  // go get the key
                  return launchDefaultMessagingKey$().pipe(
                    switchMap((defaultMessagingKeyResponse) => {
                      if (defaultMessagingKeyResponse.encryptedMessagingKeyRandomness) {
                        this.SetEncryptedMessagingKeyRandomnessForPublicKey(
                          PublicKeyBase58Check,
                          defaultMessagingKeyResponse.encryptedMessagingKeyRandomness
                        );
                        return this.GetDefaultKey(endpoint, PublicKeyBase58Check).pipe(
                          switchMap((defaultKey) => {
                            return of({
                              defaultKey,
                              defaultMessagingKeyResponse,
                            });
                          }),
                          switchMap(({ defaultKey, defaultMessagingKeyResponse }) => {
                            return !defaultKey
                              ? callRegisterGroupMessagingKey$(defaultMessagingKeyResponse).pipe(
                                  switchMap((groupMessagingKeyResponse) => {
                                    if (!groupMessagingKeyResponse) {
                                      throwError("Error creating default key");
                                    }
                                    return of(defaultMessagingKeyResponse);
                                  })
                                )
                              : of(defaultMessagingKeyResponse);
                          }),
                          switchMap((_) => {
                            return this.identityService
                              .decrypt({
                                ...this.identityService.identityServiceParamsForKey(PublicKeyBase58Check),
                                encryptedMessages: res.encryptedMessages,

                                encryptedMessagingKeyRandomness:
                                  defaultMessagingKeyResponse.encryptedMessagingKeyRandomness,
                              })
                              .pipe(
                                map((decryptedHexes) =>
                                  addDecryptedMessagesToMessagePayload(res, decryptedHexes, false)
                                )
                              );
                          })
                        );
                      }
                    })
                  );
                } else if (decryptedResponse.decryptedHexes) {
                  return addDecryptedMessagesToMessagePayload(res, decryptedResponse, true);
                } else {
                  throw "something went wrong with decrypting";
                }
              })
            );
        })
      )
      .pipe(
        switchMap((t) => {
          return t;
        })
      );
    return req.pipe(catchError(this._handleError));
  }

  // TODO: new messaging
  GetAllMessagingGroupKeys(
    endpoint: string,
    OwnerPublicKeyBase58Check: string
  ): Observable<GetAllMessagingGroupKeysResponse> {
    return this.post(endpoint, BackendRoutes.GetAllMessagingGroupKeys, {
      OwnerPublicKeyBase58Check,
    });
  }

  // TODO: new messaging
  GetDefaultKey(endpoint: string, publicKeyBase58Check: string): Observable<MessagingGroupEntryResponse | null> {
    return this.GetAllMessagingGroupKeys(endpoint, publicKeyBase58Check).pipe(
      map((res) => {
        const defaultKeys = res.MessagingGroupEntries.filter((messagingGroup: MessagingGroupEntryResponse) => {
          return messagingGroup.MessagingGroupKeyName === "default-key";
        });
        return defaultKeys.length ? defaultKeys[0] : null;
      })
    );
  }

  CreateLike(ReaderPublicKeyBase58Check: string, LikedPostHashHex: string, IsUnlike: boolean): Observable<any> {
    return from(
      updateLikeStatus({
        ReaderPublicKeyBase58Check,
        LikedPostHashHex,
        IsUnlike,
      })
    ).pipe(
      map(({ constructedTransactionResponse, submittedTransactionResponse }) => ({
        ...constructedTransactionResponse,
        ...submittedTransactionResponse,
      }))
    );
  }

  CreatePostAssociation(
    TransactorPublicKeyBase58Check: string,
    PostHashHex: string,
    AssociationType: AssociationType,
    AssociationValue: AssociationValue
  ): Observable<any> {
    return from(
      createPostAssociation({
        TransactorPublicKeyBase58Check,
        PostHashHex,
        AppPublicKeyBase58Check: BackendApiService.DIAMOND_APP_PUBLIC_KEY,
        AssociationType,
        AssociationValue,
      })
    ).pipe(map(mergeTxResponse));
  }

  DeletePostAssociation(TransactorPublicKeyBase58Check: string, AssociationID: string): Observable<any> {
    return from(
      deletePostAssociation({
        TransactorPublicKeyBase58Check,
        AssociationID,
      })
    ).pipe(map(mergeTxResponse));
  }

  // TODO: add associations data calls
  GetAllPostAssociations(
    PostHashHex: string,
    AssociationType: AssociationType,
    TransactorPublicKeyBase58Check?: string,
    AssociationValue?: AssociationValue,
    total: number = 0
  ) {
    const ASSOCIATIONS_PER_REQUEST_LIMIT = 100;
    let receivedItems = [];

    const fetchAssociationsChunk = (LastSeenAssociationID?: string) => {
      return this.GetPostAssociations(
        PostHashHex,
        AssociationType,
        TransactorPublicKeyBase58Check,
        AssociationValue,
        LastSeenAssociationID,
        ASSOCIATIONS_PER_REQUEST_LIMIT
      ).pipe(
        tap(({ Associations }) => {
          receivedItems = [...receivedItems, ...Associations];
        })
      );
    };

    return fetchAssociationsChunk().pipe(
      expand(() => {
        if (receivedItems.length < total) {
          return fetchAssociationsChunk(receivedItems[receivedItems.length - 1].AssociationID);
        }
        return EMPTY;
      }),
      map((res) => res.Associations),
      reduce((acc, val) => acc.concat(val), new Array<PostAssociation>())
    );
  }

  GetPostAssociations(
    PostHashHex: string,
    AssociationType: AssociationType,
    TransactorPublicKeyBase58Check?: string,
    AssociationValues?: AssociationValue | AssociationValue[],
    LastSeenAssociationID?: string,
    Limit: number = 100
  ): Observable<any> {
    const isArray = AssociationValues && Array.isArray(AssociationValues);

    return from(
      getPostAssociations({
        TransactorPublicKeyBase58Check,
        PostHashHex,
        AssociationType: AssociationType as string,
        ...(isArray && { AssociationValues: AssociationValues as string[] }),
        ...(!isArray && AssociationValues && { AssociationValue: AssociationValues as string }),
        LastSeenAssociationID,
        Limit,
      })
    );
  }

  // TODO: add associations data calls
  GetPostAssociationsCounts(
    Post: PostEntryResponse,
    AssociationType: AssociationType,
    AssociationValues: Array<AssociationValue>,
    SkipLegacyLikes: boolean = false
  ): Observable<PostAssociationCountsResponse> {
    return from(
      countPostAssociations({
        PostHashHex: Post.PostHashHex,
        AssociationType,
        AssociationValues,
      })
    ).pipe(
      map((response) => {
        if (SkipLegacyLikes) {
          return response;
        }

        const { Counts, Total } = response;

        return {
          Counts: {
            ...Counts,
            [AssociationReactionValue.LIKE]: (Counts[AssociationReactionValue.LIKE] || 0) + Post.LikeCount,
          },
          Total: Total + Post.LikeCount,
        };
      })
    );
  }

  SendDiamonds(
    SenderPublicKeyBase58Check: string,
    ReceiverPublicKeyBase58Check: string,
    DiamondPostHashHex: string,
    DiamondLevel: number
  ): Observable<any> {
    return from(
      sendDiamonds({
        SenderPublicKeyBase58Check,
        ReceiverPublicKeyBase58Check,
        DiamondPostHashHex,
        DiamondLevel,
      })
    ).pipe(
      map((res) => ({
        ...res.constructedTransactionResponse,
        ...res.submittedTransactionResponse,
      }))
    );
  }

  GetDiamondsForPublicKey(PublicKeyBase58Check: string, FetchYouDiamonded: boolean = false): Observable<any> {
    return from(
      getDiamondsForUser({
        PublicKeyBase58Check,
        FetchYouDiamonded,
      })
    );
  }

  GetLikesForPost(
    PostHashHex: string,
    Offset: number,
    Limit: number,
    ReaderPublicKeyBase58Check: string
  ): Observable<any> {
    return from(
      getLikesForPost({
        PostHashHex,
        Offset,
        Limit,
        ReaderPublicKeyBase58Check,
      })
    );
  }

  GetDiamondsForPost(
    PostHashHex: string,
    Offset: number,
    Limit: number,
    ReaderPublicKeyBase58Check: string
  ): Observable<any> {
    return from(
      getDiamondsForPost({
        PostHashHex,
        Offset,
        Limit,
        ReaderPublicKeyBase58Check,
      })
    );
  }

  GetRepostsForPost(
    PostHashHex: string,
    Offset: number,
    Limit: number,
    ReaderPublicKeyBase58Check: string
  ): Observable<any> {
    return from(
      getRepostsForPost({
        PostHashHex,
        Offset,
        Limit,
        ReaderPublicKeyBase58Check,
      })
    );
  }

  GetQuoteRepostsForPost(
    PostHashHex: string,
    Offset: number,
    Limit: number,
    ReaderPublicKeyBase58Check: string
  ): Observable<any> {
    return from(
      getQuoteRepostsForPost({
        PostHashHex,
        Offset,
        Limit,
        ReaderPublicKeyBase58Check,
      })
    );
  }

  BuyOrSellCreatorCoin(
    // The public key of the user who is making the buy/sell.
    UpdaterPublicKeyBase58Check: string,
    // The public key of the profile that the purchaser is trying
    // to buy.
    CreatorPublicKeyBase58Check: string,
    // Whether this is a "buy" or "sell"
    OperationType: string,
    // Generally, only one of these will be used depending on the OperationType
    // set. In a Buy transaction, DeSoToSellNanos will be converted into
    // creator coin on behalf of the user. In a Sell transaction,
    // CreatorCoinToSellNanos will be converted into DeSo. In an AddDeSo
    // operation, DeSoToAddNanos will be aded for the user. This allows us to
    // support multiple transaction types with same meta field.
    DeSoToSellNanos: number,
    CreatorCoinToSellNanos: number,
    DeSoToAddNanos: number,
    // When a user converts DeSo into CreatorCoin, MinCreatorCoinExpectedNanos
    // specifies the minimum amount of creator coin that the user expects from their
    // transaction. And vice versa when a user is converting CreatorCoin for DeSo.
    // Specifying these fields prevents the front-running of users' buy/sell. Setting
    // them to zero turns off the check. Give it your best shot, Ivan.
    MinDeSoExpectedNanos: number,
    MinCreatorCoinExpectedNanos: number,
    broadcast: boolean = true
  ): Observable<any> {
    DeSoToSellNanos = Math.floor(DeSoToSellNanos);
    CreatorCoinToSellNanos = Math.floor(CreatorCoinToSellNanos);
    DeSoToAddNanos = Math.floor(DeSoToAddNanos);
    MinDeSoExpectedNanos = Math.floor(MinDeSoExpectedNanos);
    MinCreatorCoinExpectedNanos = Math.floor(MinCreatorCoinExpectedNanos);

    if (OperationType === "buy") {
      return from(
        buyCreatorCoin(
          {
            UpdaterPublicKeyBase58Check,
            CreatorPublicKeyBase58Check,
            DeSoToSellNanos,
            DeSoToAddNanos,
            MinDeSoExpectedNanos,
            MinCreatorCoinExpectedNanos,
          },
          {
            broadcast,
          }
        )
      ).pipe(map(mergeTxResponse));
    }
    if (OperationType === "sell") {
      return from(
        sellCreatorCoin(
          {
            UpdaterPublicKeyBase58Check,
            CreatorPublicKeyBase58Check,
            CreatorCoinToSellNanos,
            DeSoToAddNanos,
            MinDeSoExpectedNanos,
            MinCreatorCoinExpectedNanos,
          },
          { broadcast }
        )
      ).pipe(map(mergeTxResponse));
    }
  }

  TransferCreatorCoin(
    SenderPublicKeyBase58Check: string,
    CreatorPublicKeyBase58Check: string,
    ReceiverUsernameOrPublicKeyBase58Check: string,
    CreatorCoinToTransferNanos: number,
    broadcast: boolean = true
  ): Observable<any> {
    CreatorCoinToTransferNanos = Math.floor(CreatorCoinToTransferNanos);

    const routeName = BackendRoutes.RoutePathTransferCreatorCoin;
    return from(
      transferCreatorCoin(
        {
          SenderPublicKeyBase58Check,
          CreatorPublicKeyBase58Check,
          ReceiverUsernameOrPublicKeyBase58Check,
          CreatorCoinToTransferNanos,
        },
        { broadcast }
      )
    ).pipe(map(mergeTxResponse));
  }

  BlockPublicKey(
    PublicKeyBase58Check: string,
    BlockPublicKeyBase58Check: string,
    Unblock: boolean = false
  ): Observable<any> {
    return from(
      blockPublicKey({
        BlockPublicKeyBase58Check,
        PublicKeyBase58Check,
        Unblock,
      })
    );
  }

  // TODO: migrate to jwt posts
  MarkContactMessagesRead(
    endpoint: string,
    UserPublicKeyBase58Check: string,
    ContactPublicKeyBase58Check: string
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathMarkContactMessagesRead, UserPublicKeyBase58Check, {
      UserPublicKeyBase58Check,
      ContactPublicKeyBase58Check,
    });
  }

  // TODO: migrate to jwt posts
  MarkAllMessagesRead(endpoint: string, UserPublicKeyBase58Check: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathMarkAllMessagesRead, UserPublicKeyBase58Check, {
      UserPublicKeyBase58Check,
    });
  }

  // Note that FetchStartIndex < 0 means "fetch me the latest notifications."
  // To implement pagination, all you have to do
  // is set FetchStartIndex to the Index value of the last notification in
  // the list and re-fetch. The endpoint will return NumToFetch notifications
  // that include all notifications that are currently in the mempool.
  GetNotifications(
    PublicKeyBase58Check: string,
    FetchStartIndex: number,
    NumToFetch: number,
    FilteredOutNotificationCategories: {}
  ): Observable<any> {
    return from(
      getNotifications(
        {
          PublicKeyBase58Check,
          FetchStartIndex,
          NumToFetch,
          FilteredOutNotificationCategories,
        },
        {
          nodeURI: environment.verificationEndpointHostname,
        }
      )
    );
  }

  // TODO: add to jwt posts
  SetNotificationsMetadata(
    PublicKeyBase58Check: string,
    LastSeenIndex: number,
    LastUnreadNotificationIndex: number,
    UnreadNotifications: number
  ): Observable<any> {
    return from(
      setNotificationMetadata({
        PublicKeyBase58Check,
        LastSeenIndex,
        LastUnreadNotificationIndex,
        UnreadNotifications,
      })
    );
  }

  // TODO: add to data lib
  GetUnreadNotificationsCount(endpoint: string, PublicKeyBase58Check: string): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathGetUnreadNotificationsCount, {
      PublicKeyBase58Check,
    });
  }

  // TODO: add to data lib
  GetAppState(endpoint: string, PublicKeyBase58Check: string): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathGetAppState, {
      PublicKeyBase58Check,
    });
  }

  UpdateUserGlobalMetadata(
    UserPublicKeyBase58Check: string,
    Email: string,
    MessageReadStateUpdatesByContact: any
  ): Observable<any> {
    return from(updateUserGlobalMetadata({ UserPublicKeyBase58Check, Email, MessageReadStateUpdatesByContact }));
  }

  GetUserGlobalMetadata(UserPublicKeyBase58Check: string): Observable<any> {
    return from(getUserGlobalMetadata({ UserPublicKeyBase58Check }));
  }

  // TODO: is this actually part of the public node api??
  ResendVerifyEmail(endpoint: string, PublicKey: string) {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathResendVerifyEmail, PublicKey, {
      PublicKey,
    });
  }

  // TODO: is this actually part of the public node api??
  VerifyEmail(endpoint: string, PublicKey: string, EmailHash: string): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathVerifyEmail, {
      PublicKey,
      EmailHash,
    });
  }

  GetUserMetadata(endpoint: string, PublicKeyBase58Check: string): Observable<GetUserMetadataResponse> {
    return from(getUserMetadata({ PublicKeyBase58Check }));
  }

  // QUESTION: is this still needed??
  GetJumioStatusForPublicKey(endpoint: string, PublicKeyBase58Check: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathGetJumioStatusForPublicKey, PublicKeyBase58Check, {
      PublicKeyBase58Check,
    });
  }

  // TODO: admin endpoints
  AdminGetVerifiedUsers(endpoint: string, AdminPublicKey: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetVerifiedUsers, AdminPublicKey, {
      AdminPublicKey,
    });
  }

  AdminGetUsernameVerificationAuditLogs(endpoint: string, AdminPublicKey: string, Username: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetUsernameVerificationAuditLogs, AdminPublicKey, {
      AdminPublicKey,
      Username,
    });
  }

  AdminGrantVerificationBadge(endpoint: string, AdminPublicKey: string, UsernameToVerify: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGrantVerificationBadge, AdminPublicKey, {
      AdminPublicKey,
      UsernameToVerify,
    });
  }

  AdminRemoveVerificationBadge(
    endpoint: string,
    AdminPublicKey: string,
    UsernameForWhomToRemoveVerification: string
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminRemoveVerificationBadge, AdminPublicKey, {
      AdminPublicKey,
      UsernameForWhomToRemoveVerification,
    });
  }

  AdminGetUserAdminData(endpoint: string, AdminPublicKey: string, UserPublicKeyBase58Check: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetUserAdminData, AdminPublicKey, {
      AdminPublicKey,
      UserPublicKeyBase58Check,
    });
  }

  NodeControl(endpoint: string, AdminPublicKey: string, Address: string, OperationType: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.NodeControlRoute, AdminPublicKey, {
      AdminPublicKey,
      Address,
      OperationType,
    });
  }

  // NOTE: this is just a NodeControl wrapper
  UpdateMiner(endpoint: string, AdminPublicKey: string, MinerPublicKeys: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.NodeControlRoute, AdminPublicKey, {
      AdminPublicKey,
      MinerPublicKeys,
      OperationType: "update_miner",
    });
  }

  AdminGetUserGlobalMetadata(
    endpoint: string,
    AdminPublicKey: string,
    // The public key of the user for whom we'd like to get global metadata
    UserPublicKeyBase58Check: string
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetUserGlobalMetadata, AdminPublicKey, {
      AdminPublicKey,
      UserPublicKeyBase58Check,
    });
  }

  AdminUpdateUserGlobalMetadata(
    endpoint: string,
    AdminPublicKey: string,
    // The public key of the user to update.
    UserPublicKeyBase58Check: string,
    Username: string,
    IsBlacklistUpdate: boolean,
    RemoveEverywhere: boolean,
    RemoveFromLeaderboard: boolean,
    IsWhitelistUpdate: boolean,
    WhitelistPosts: boolean,
    RemovePhoneNumberMetadata: boolean
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUpdateUserGlobalMetadata, AdminPublicKey, {
      UserPublicKeyBase58Check,
      Username,
      IsBlacklistUpdate,
      RemoveEverywhere,
      RemoveFromLeaderboard,
      IsWhitelistUpdate,
      WhitelistPosts,
      RemovePhoneNumberMetadata,
      AdminPublicKey,
    });
  }

  AdminGetAllUserGlobalMetadata(endpoint: string, AdminPublicKey: string, NumToFetch: number): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetAllUserGlobalMetadata, AdminPublicKey, {
      AdminPublicKey,
      NumToFetch,
    });
  }

  AdminPinPost(endpoint: string, AdminPublicKey: string, PostHashHex: string, UnpinPost: boolean): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminPinPost, AdminPublicKey, {
      AdminPublicKey,
      PostHashHex,
      UnpinPost,
    });
  }

  AdminUpdateGlobalFeed(
    endpoint: string,
    AdminPublicKey: string,
    PostHashHex: string,
    RemoveFromGlobalFeed: boolean
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUpdateGlobalFeed, AdminPublicKey, {
      AdminPublicKey,
      PostHashHex,
      RemoveFromGlobalFeed,
    });
  }

  AdminRemoveNilPosts(endpoint: string, AdminPublicKey: string, NumPostsToSearch: number = 1000): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminRemoveNilPosts, AdminPublicKey, {
      AdminPublicKey,
      NumPostsToSearch,
    });
  }

  AdminReprocessBitcoinBlock(
    endpoint: string,
    AdminPublicKey: string,
    blockHashOrBlockHeight: string
  ): Observable<any> {
    return this.jwtPost(
      endpoint,
      `${BackendRoutes.ReprocessBitcoinBlockRoute}/${blockHashOrBlockHeight}`,
      AdminPublicKey,
      {
        AdminPublicKey,
      }
    );
  }

  AdminGetMempoolStats(endpoint: string, AdminPublicKey: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetMempoolStats, AdminPublicKey, {
      AdminPublicKey,
    });
  }

  SwapIdentity(
    UpdaterPublicKeyBase58Check: string,
    FromUsernameOrPublicKeyBase58Check: string,
    ToUsernameOrPublicKeyBase58Check: string,
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    return from(
      adminSwapIdentity({
        UpdaterPublicKeyBase58Check,
        FromUsernameOrPublicKeyBase58Check,
        ToUsernameOrPublicKeyBase58Check,
        MinFeeRateNanosPerKB,
      })
    );
  }

  SetUSDCentsToDeSoReserveExchangeRate(USDCentsPerDeSo: number): Observable<any> {
    return from(
      adminSetUSDCentsToDESOReserveExchangeRate({
        USDCentsPerDeSo,
      })
    );
  }

  GetUSDCentsToDeSoReserveExchangeRate(): Observable<any> {
    return from(adminGetUSDCentsToDESOReserveExchangeRate());
  }

  SetBuyDeSoFeeBasisPoints(BuyDeSoFeeBasisPoints: number): Observable<any> {
    return from(
      adminSetBuyDesoFeeBasisPoints({
        BuyDeSoFeeBasisPoints,
        // FIXME: this should not be required. it gets set by the library.
        AdminPublicKey: undefined,
      })
    );
  }

  GetBuyDeSoFeeBasisPoints(): Observable<any> {
    return from(adminGetBuyDesoFeeBasisPoints());
  }

  UpdateGlobalParams(
    endpoint: string,
    UpdaterPublicKeyBase58Check: string,
    USDCentsPerBitcoin: number,
    CreateProfileFeeNanos: number,
    MinimumNetworkFeeNanosPerKB: number,
    MaxCopiesPerNFT: number,
    CreateNFTFeeNanos: number,
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    const request = this.jwtPost(endpoint, BackendRoutes.RoutePathUpdateGlobalParams, UpdaterPublicKeyBase58Check, {
      UpdaterPublicKeyBase58Check,
      USDCentsPerBitcoin,
      CreateProfileFeeNanos,
      MaxCopiesPerNFT,
      CreateNFTFeeNanos,
      MinimumNetworkFeeNanosPerKB,
      MinFeeRateNanosPerKB,
      AdminPublicKey: UpdaterPublicKeyBase58Check,
    });
    return this.signAndSubmitTransaction(endpoint, request, UpdaterPublicKeyBase58Check);
  }

  GetGlobalParams(endpoint: string, UpdaterPublicKeyBase58Check: string): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathGetGlobalParams, {
      UpdaterPublicKeyBase58Check,
    });
  }

  AdminGetNFTDrop(endpoint: string, UpdaterPublicKeyBase58Check: string, DropNumber: number): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetNFTDrop, UpdaterPublicKeyBase58Check, {
      DropNumber,
      AdminPublicKey: UpdaterPublicKeyBase58Check,
    });
  }

  AdminUpdateNFTDrop(
    endpoint: string,
    UpdaterPublicKeyBase58Check: string,
    DropNumber: number,
    DropTstampNanos: number,
    IsActive: boolean,
    NFTHashHexToAdd: string,
    NFTHashHexToRemove: string
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUpdateNFTDrop, UpdaterPublicKeyBase58Check, {
      DropNumber,
      DropTstampNanos,
      IsActive,
      NFTHashHexToAdd,
      NFTHashHexToRemove,
      AdminPublicKey: UpdaterPublicKeyBase58Check,
    });
  }

  // TODO: delete
  EvictUnminedBitcoinTxns(
    endpoint: string,
    UpdaterPublicKeyBase58Check,
    BitcoinTxnHashes: string[],
    DryRun: boolean
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathEvictUnminedBitcoinTxns, UpdaterPublicKeyBase58Check, {
      BitcoinTxnHashes,
      DryRun,
      AdminPublicKey: UpdaterPublicKeyBase58Check,
    });
  }

  GetFullTikTokURL(endpoint: string, TikTokShortVideoID: string): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathGetFullTikTokURL, {
      TikTokShortVideoID,
    }).pipe(
      map((res) => {
        return res.FullTikTokURL;
      })
    );
  }

  // TODO: delete
  AdminResetJumioAttemptsForPublicKey(
    endpoint: string,
    AdminPublicKey: string,
    PublicKeyBase58Check: string,
    Username: string
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminResetJumioForPublicKey, AdminPublicKey, {
      AdminPublicKey,
      PublicKeyBase58Check,
      Username,
    });
  }

  // TODO: delete
  AdminUpdateJumioDeSo(endpoint: string, AdminPublicKey: string, DeSoNanos: number): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUpdateJumioDeSo, AdminPublicKey, {
      DeSoNanos,
      AdminPublicKey,
    });
  }

  // TODO: delete
  AdminJumioCallback(
    endpoint: string,
    AdminPublicKey: string,
    PublicKeyBase58Check: string,
    Username: string
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminJumioCallback, AdminPublicKey, {
      PublicKeyBase58Check,
      Username,
      AdminPublicKey,
    });
  }

  AdminGetUnfilteredHotFeed(
    endpoint: string,
    AdminPublicKey: string,
    ResponseLimit: number,
    SeenPosts: Array<string>
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetUnfilteredHotFeed, AdminPublicKey, {
      AdminPublicKey,
      ResponseLimit,
      SeenPosts,
    });
  }

  AdminGetHotFeedAlgorithm(endpoint: string, AdminPublicKey: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetHotFeedAlgorithm, AdminPublicKey, {
      AdminPublicKey,
    });
  }

  AdminUpdateHotFeedAlgorithm(
    endpoint: string,
    AdminPublicKey: string,
    InteractionCap: number,
    InteractionCapTag: number,
    TimeDecayBlocks: number,
    TimeDecayBlocksTag: number,
    TxnTypeMultiplierMap: { [txnType: number]: number }
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUpdateHotFeedAlgorithm, AdminPublicKey, {
      AdminPublicKey,
      InteractionCap,
      InteractionCapTag,
      TimeDecayBlocks,
      TimeDecayBlocksTag,
      TxnTypeMultiplierMap,
    });
  }

  AdminUpdateHotFeedPostMultiplier(
    endpoint: string,
    AdminPublicKey: string,
    PostHashHex: string,
    Multiplier: number
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUpdateHotFeedPostMultiplier, AdminPublicKey, {
      AdminPublicKey,
      PostHashHex,
      Multiplier,
    });
  }

  AdminUpdateHotFeedUserMultiplier(
    endpoint: string,
    AdminPublicKey: string,
    Username: string,
    InteractionMultiplier: number,
    PostsMultiplier: number
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUpdateHotFeedUserMultiplier, AdminPublicKey, {
      AdminPublicKey,
      Username,
      InteractionMultiplier,
      PostsMultiplier,
    });
  }

  AdminGetHotFeedUserMultiplier(endpoint: string, AdminPublicKey: string, Username: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetHotFeedUserMultiplier, AdminPublicKey, {
      AdminPublicKey,
      Username,
    });
  }

  // TODO: delete
  AdminCreateReferralHash(
    endpoint: string,
    AdminPublicKey: string,
    UserPublicKeyBase58Check: string,
    Username: string,
    ReferrerAmountUSDCents: number,
    RefereeAmountUSDCents: number,
    MaxReferrals: number,
    RequiresJumio: boolean
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminCreateReferralHash, AdminPublicKey, {
      UserPublicKeyBase58Check,
      Username,
      ReferrerAmountUSDCents,
      RefereeAmountUSDCents,
      MaxReferrals,
      RequiresJumio,
      AdminPublicKey,
    });
  }

  // TODO: delete
  AdminUpdateReferralHash(
    endpoint: string,
    AdminPublicKey: string,
    ReferralHashBase58: string,
    ReferrerAmountUSDCents: number,
    RefereeAmountUSDCents: number,
    MaxReferrals: number,
    RequiresJumio: boolean,
    IsActive: boolean
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUpdateReferralHash, AdminPublicKey, {
      ReferralHashBase58,
      ReferrerAmountUSDCents,
      RefereeAmountUSDCents,
      MaxReferrals,
      RequiresJumio,
      IsActive,
      AdminPublicKey,
    });
  }

  // TODO: delete
  AdminGetAllReferralInfoForUser(
    endpoint: string,
    AdminPublicKey: string,
    UserPublicKeyBase58Check: string,
    Username: string
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetAllReferralInfoForUser, AdminPublicKey, {
      UserPublicKeyBase58Check,
      Username,
      AdminPublicKey,
    });
  }

  // TODO: delete
  AdminDownloadReferralCSV(endpoint: string, AdminPublicKey: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminDownloadReferralCSV, AdminPublicKey, {
      AdminPublicKey,
    });
  }

  // TODO: delete
  AdminDownloadRefereeCSV(endpoint: string, AdminPublicKey: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminDownloadRefereeCSV, AdminPublicKey, {
      AdminPublicKey,
    });
  }

  // TODO: delete
  AdminUploadReferralCSV(endpoint: string, AdminPublicKey: string, CSVRows: Array<Array<String>>): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUploadReferralCSV, AdminPublicKey, {
      AdminPublicKey,
      CSVRows,
    });
  }

  // TODO: delete
  GetReferralInfoForUser(endpoint: string, PublicKeyBase58Check: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathGetReferralInfoForUser, PublicKeyBase58Check, {
      PublicKeyBase58Check,
    });
  }

  // TODO: ignore
  GetReferralInfoForReferralHash(
    endpoint: string,
    ReferralHash: string
  ): Observable<{ ReferralInfoResponse: any; CountrySignUpBonus: CountryLevelSignUpBonus }> {
    return this.post(endpoint, BackendRoutes.RoutePathGetReferralInfoForReferralHash, {
      ReferralHash,
    });
  }

  // TODO: delete
  AdminResetTutorialStatus(endpoint: string, AdminPublicKey: string, PublicKeyBase58Check: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminResetTutorialStatus, AdminPublicKey, {
      PublicKeyBase58Check,
      AdminPublicKey,
    });
  }

  // TODO: delete
  AdminUpdateTutorialCreators(
    endpoint: string,
    AdminPublicKey: string,
    PublicKeyBase58Check: string,
    IsRemoval: boolean,
    IsWellKnown: boolean
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminUpdateTutorialCreators, AdminPublicKey, {
      PublicKeyBase58Check,
      IsRemoval,
      IsWellKnown,
      AdminPublicKey,
    });
  }

  // TODO: ignore
  GetTutorialCreators(endpoint: string, PublicKeyBase58Check: string, ResponseLimit: number): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathGetTutorialCreators, {
      ResponseLimit,
      PublicKeyBase58Check,
    });
  }

  // TODO: delete
  UpdateTutorialStatus(
    endpoint: string,
    PublicKeyBase58Check: string,
    TutorialStatus: string,
    CreatorPurchasedInTutorialPublicKey?: string,
    ClearCreatorCoinPurchasedInTutorial?: boolean
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathUpdateTutorialStatus, PublicKeyBase58Check, {
      PublicKeyBase58Check,
      TutorialStatus,
      CreatorPurchasedInTutorialPublicKey,
      ClearCreatorCoinPurchasedInTutorial,
    });
  }

  // TODO: delete
  AdminGetTutorialCreators(endpoint: string, PublicKeyBase58Check: string, ResponseLimit: number): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathAdminGetTutorialCreators, PublicKeyBase58Check, {
      ResponseLimit,
      PublicKeyBase58Check,
      AdminPublicKey: PublicKeyBase58Check,
    });
  }

  GetWyreWalletOrderForPublicKey(
    endpoint: string,
    AdminPublicKeyBase58Check: string,
    PublicKeyBase58Check: string,
    Username: string
  ): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathGetWyreWalletOrdersForPublicKey, AdminPublicKeyBase58Check, {
      AdminPublicKey: AdminPublicKeyBase58Check,
      PublicKeyBase58Check,
      Username,
    });
  }

  // Wyre
  GetWyreWalletOrderQuotation(
    endpoint: string,
    SourceAmount: number,
    Country: string,
    SourceCurrency: string
  ): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathGetWyreWalletOrderQuotation, {
      SourceAmount,
      Country,
      SourceCurrency,
    });
  }

  GetWyreWalletOrderReservation(
    endpoint: string,
    ReferenceId: string,
    SourceAmount: number,
    Country: string,
    SourceCurrency: string
  ): Observable<any> {
    return this.post(endpoint, BackendRoutes.RoutePathGetWyreWalletOrderReservation, {
      ReferenceId,
      SourceAmount,
      Country,
      SourceCurrency,
    });
  }

  // Tutorial Endpoints
  // TODO: delete
  StartOrSkipTutorial(endpoint: string, PublicKeyBase58Check: string, IsSkip: boolean): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathStartOrSkipTutorial, PublicKeyBase58Check, {
      PublicKeyBase58Check,
      IsSkip,
    });
  }

  // TODO: delete
  CompleteTutorial(endpoint: string, PublicKeyBase58Check: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathCompleteTutorial, PublicKeyBase58Check, {
      PublicKeyBase58Check,
    });
  }

  GetVideoStatus(endpoint: string, videoId: string): Observable<any> {
    return this.get(endpoint, `${BackendRoutes.RoutePathGetVideoStatus}/${videoId}`);
  }

  GetLinkPreview(endpoint: string, url: string): Observable<any> {
    return this.get(endpoint, `${BackendRoutes.RoutePathGetLinkPreview}?url=${encodeURIComponent(url)}`);
  }

  // TODO: use buildProxyImageUrl
  ConstructProxyImageUrl(endpoint: string, url: string): string {
    return `${endpoint}/${BackendRoutes.RoutePathProxyImage}?url=${encodeURIComponent(url)}`;
  }

  // Error parsing
  stringifyError(err): string {
    if (err && err.error && err.error.error) {
      return err.error.error;
    }

    return JSON.stringify(err);
  }

  parsePostError(err): string {
    if (err.status === 0) {
      return `${environment.node.name} is experiencing heavy load. Please try again in one minute.`;
    }

    let errorMessage = JSON.stringify(err);
    if (err && err.error && err.error.error) {
      errorMessage = err.error.error;
      errorMessage = parseCleanErrorMsg(errorMessage);
    }
    return errorMessage;
  }

  parseProfileError(err): string {
    if (err.status === 0) {
      return `${environment.node.name} is experiencing heavy load. Please try again in one minute.`;
    }

    let errorMessage = JSON.stringify(err);
    if (err && err.error && err.error.error) {
      errorMessage = err.error.error;
      errorMessage = parseCleanErrorMsg(errorMessage);
    }
    return errorMessage;
  }

  parseMessageError(err): string {
    if (err.status === 0) {
      return `${environment.node.name} is experiencing heavy load. Please try again in one minute.`;
    }

    let errorMessage = JSON.stringify(err);
    if (err && err.error && err.error.error) {
      errorMessage = err.error.error;
      errorMessage = parseCleanErrorMsg(errorMessage);
    }
    return errorMessage;
  }
}

function mergeTxResponse({ constructedTransactionResponse, submittedTransactionResponse }) {
  return { ...constructedTransactionResponse, ...submittedTransactionResponse };
}
