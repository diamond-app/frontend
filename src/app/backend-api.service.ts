import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import {
  acceptNFTBid,
  acceptNFTTransfer,
  adminGetAllUserGlobalMetadata,
  adminGetBuyDesoFeeBasisPoints,
  adminGetHotFeedAlgorithm,
  adminGetHotFeedUserMultiplier,
  adminGetMempoolStats,
  adminGetNFTDrop,
  adminGetUnfilteredHotFeed,
  adminGetUSDCentsToDESOReserveExchangeRate,
  adminGetUserAdminData,
  adminGetUserGlobalMetadata,
  adminGetUsernameVerificationAuditLog,
  adminGetVerifiedUsers,
  adminGetWyreWalletOrderQuotation,
  adminGetWyreWalletOrderReservation,
  adminGetWyreWalletOrdersForUser,
  adminGrantVerificationBadge,
  adminNodeControl,
  adminPinPost,
  adminRemoveNilPosts,
  adminRemoveVerificationBadge,
  adminReprocessBitcoinBlock,
  adminSetBuyDesoFeeBasisPoints,
  adminSetUSDCentsToDESOReserveExchangeRate,
  adminSwapIdentity,
  adminUpdateGlobalFeed,
  adminUpdateGlobalParams,
  adminUpdateHotFeedAlgorithm,
  adminUpdateHotFeedPostMultiplier,
  adminUpdateHotFeedUserMultiplier,
  adminUpdateNFTDrop,
  adminUpdateUserGlobalMetadata,
  blockPublicKey,
  buildProfilePictureUrl,
  buildProxyImageURL,
  burnNFT,
  buyCreatorCoin,
  checkPartyAccessGroups,
  ConstructedTransactionResponse,
  countPostAssociations,
  createNFT,
  createNFTBid,
  createPostAssociation,
  decryptChatMessage,
  deletePostAssociation,
  DeSoBodySchema,
  encryptChatMessage,
  getAllBidsForNFT,
  getAppState,
  getBlockTemplate,
  GetBlockTemplateResponse,
  getDiamondedPosts,
  getDiamondsForPost,
  getDiamondsForUser,
  GetExchangeRateResponse,
  getExchangeRates,
  getFollowersForUser,
  getFullTikTokURL,
  getGlobalParams,
  getHodlersForUser,
  getHotFeed,
  getLikesForPost,
  getLinkPreview,
  getNFTBidsForUser,
  getNFTCollectionSummary,
  getNFTEntriesForPost,
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
  getUnreadNotificationsCount,
  getUserGlobalMetadata,
  getUserMetadata,
  GetUserMetadataResponse,
  GetUsersResponse,
  getUsersStateless,
  getVideoStatus,
  HodlersSortType,
  identity,
  NFTEntryResponse,
  PostEntryResponse,
  resendVerifyEmail,
  sellCreatorCoin,
  sendDeso,
  SendDeSoResponse,
  sendDiamonds,
  setNotificationMetadata,
  submitPost,
  transferCreatorCoin,
  transferNFT,
  updateFollowingStatus,
  updateNFT,
  updateProfile,
  updateUserGlobalMetadata,
  uploadImage,
  uploadVideo,
  UploadVideoV2Response,
  verifyEmail,
} from "deso-protocol";
import { EMPTY, forkJoin, from, Observable, of, throwError } from "rxjs";
import { catchError, expand, map, reduce, switchMap, tap } from "rxjs/operators";
import { environment } from "src/environments/environment";
import { parseCleanErrorMsg } from "../lib/helpers/pretty-errors";

export class BackendRoutes {
  static RoutePathDeleteIdentities = "/api/v0/delete-identities";

  // Tutorial
  static RoutePathStartOrSkipTutorial = "/api/v0/start-or-skip-tutorial";
  static RoutePathCompleteTutorial = "/api/v0/complete-tutorial";
  static RoutePathUpdateTutorialStatus = "/api/v0/update-tutorial-status";
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

export enum AssociationType {
  reaction = "REACTION",
  pollResponse = "POLL_RESPONSE",
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
export type AssociationValue = AssociationReactionValue | string;

@Injectable({
  providedIn: "root",
})
export class BackendApiService {
  constructor(private httpClient: HttpClient) {}

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
  PushNotificationsDismissalKey = "pushNotificationsDismissedAt";

  // TODO: Wipe all this data when transition is complete
  LegacyUserListKey = "userList";
  LegacySeedListKey = "seedList";

  ShowInstallPWAPanelKey = "showInstallPWA";

  SetStorage(key: string, value: any) {
    localStorage.setItem(key, value || value === false ? JSON.stringify(value) : "");
  }

  RemoveStorage(key: string) {
    localStorage.removeItem(key);
  }

  GetStorage(key: string) {
    const data = localStorage.getItem(key);
    if (data === null || data === "") {
      return null;
    }

    return JSON.parse(data);
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

      console.error(`Backend returned code ${error.status}, ` + `body was: ${JSON.stringify(error)}`);
    }
    // return an observable with a user-facing error message
    return throwError(error);
  }

  post(endpoint: string, path: string, body: any): Observable<any> {
    return this.httpClient.post<any>(this._makeRequestURL(endpoint, path), body).pipe(catchError(this._handleError));
  }

  jwtPost(endpoint: string, path: string, publicKey: string, body: any): Observable<any> {
    return from(identity.jwt()).pipe(switchMap((JWT) => this.post(endpoint, path, { JWT, ...body })));
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

  DeleteIdentities(endpoint: string): Observable<any> {
    return this.httpClient
      .post<any>(this._makeRequestURL(endpoint, BackendRoutes.RoutePathDeleteIdentities), {}, { withCredentials: true })
      .pipe(catchError(this._handleError));
  }

  SendDeSoPreview(
    SenderPublicKeyBase58Check: string,
    RecipientPublicKeyOrUsername: string,
    AmountNanos: number
  ): Observable<SendDeSoResponse | ConstructedTransactionResponse> {
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
  ): Observable<SendDeSoResponse> {
    return from(
      sendDeso({
        SenderPublicKeyBase58Check,
        RecipientPublicKeyOrUsername,
        AmountNanos,
      }).then(mergeTxResponse)
    );
  }

  // User-related functions.
  GetUsersStateless(
    PublicKeysBase58Check: string[],
    SkipForLeaderboard: boolean = false
  ): Observable<GetUsersResponse> {
    return from(
      getUsersStateless({
        PublicKeysBase58Check,
        SkipForLeaderboard,
      })
    );
  }

  UploadImage(UserPublicKeyBase58Check: string, file: File): Observable<any> {
    return from(uploadImage({ UserPublicKeyBase58Check, file }, { nodeURI: "https://node.deso.org" }));
  }

  UploadVideo(file: File, publicKeyBase58Check: string): Observable<UploadVideoV2Response> {
    return from(uploadVideo({ file, UserPublicKeyBase58Check: publicKeyBase58Check }));
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
      }).then(mergeTxResponse)
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
      }).then(mergeTxResponse)
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
      }).then(mergeTxResponse)
    );
  }

  BurnNFT(UpdaterPublicKeyBase58Check: string, NFTPostHashHex: string, SerialNumber: number): Observable<any> {
    return from(
      burnNFT({
        UpdaterPublicKeyBase58Check,
        NFTPostHashHex,
        SerialNumber,
      }).then(mergeTxResponse)
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
      }).then(mergeTxResponse)
    );
  }

  AcceptNFTBid(
    UpdaterPublicKeyBase58Check: string,
    NFTPostHashHex: string,
    SerialNumber: number,
    BidderPublicKeyBase58Check: string,
    BidAmountNanos: number,
    UnencryptedUnlockableText: string,
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    let request = UnencryptedUnlockableText
      ? from(
          checkPartyAccessGroups({
            SenderAccessGroupKeyName: "default-key",
            RecipientAccessGroupKeyName: "default-key",
            SenderPublicKeyBase58Check: UpdaterPublicKeyBase58Check,
            RecipientPublicKeyBase58Check: BidderPublicKeyBase58Check,
          })
        ).pipe(
          switchMap((resp) => {
            const identityState = identity.snapshot();
            if (!identityState.currentUser) {
              throw new Error("No identityState.currentUser");
            }
            return from(
              encryptChatMessage(
                identityState.currentUser.primaryDerivedKey.messagingPrivateKey,
                resp.RecipientAccessGroupPublicKeyBase58Check,
                UnencryptedUnlockableText
              )
            );
          })
        )
      : of("");
    return request.pipe(
      switchMap((EncryptedUnlockableText) => {
        return from(
          acceptNFTBid({
            UpdaterPublicKeyBase58Check,
            NFTPostHashHex,
            SerialNumber,
            BidderPublicKeyBase58Check,
            BidAmountNanos,
            EncryptedUnlockableText,
            MinFeeRateNanosPerKB,
          })
        ).pipe(map(mergeTxResponse));
      })
    );
  }

  DecryptUnlockableTexts(
    ReaderPublicKeyBase58Check: string,
    UnlockableNFTEntryResponses: NFTEntryResponse[]
  ): Observable<Array<NFTEntryResponse & { DecryptedUnlockableText?: string }>> {
    const lastOwnerPublicKey = UnlockableNFTEntryResponses[0]?.LastOwnerPublicKeyBase58Check;
    if (!lastOwnerPublicKey) {
      throw new Error("lastOwnerPublicKey missing");
    }

    return from(
      checkPartyAccessGroups({
        SenderAccessGroupKeyName: "default-key",
        RecipientAccessGroupKeyName: "default-key",
        SenderPublicKeyBase58Check: lastOwnerPublicKey,
        RecipientPublicKeyBase58Check: ReaderPublicKeyBase58Check,
      })
    ).pipe(
      switchMap((resp) => {
        const identityState = identity.snapshot();
        if (!identityState.currentUser) {
          throw new Error("No identityState.currentUser");
        }
        return forkJoin(
          UnlockableNFTEntryResponses.map((nft) => {
            return decryptChatMessage(
              identityState.currentUser.primaryDerivedKey.messagingPrivateKey,
              resp.SenderAccessGroupPublicKeyBase58Check,
              nft.EncryptedUnlockableText
            );
          })
        );
      }),
      map((decryptedText) => {
        return UnlockableNFTEntryResponses.map((e, i) => ({
          ...e,
          DecryptedUnlockableText: decryptedText[i],
        }));
      }),
      catchError(this._handleError)
    );
  }

  GetNFTBidsForNFTPost(ReaderPublicKeyBase58Check: string, PostHashHex: string): Observable<any> {
    return from(
      getAllBidsForNFT({
        ReaderPublicKeyBase58Check,
        PostHashHex,
      })
    );
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
    return from(
      getNFTCollectionSummary({
        ReaderPublicKeyBase58Check,
        PostHashHex,
      })
    );
  }

  GetNFTEntriesForNFTPost(ReaderPublicKeyBase58Check: string, PostHashHex: string): Observable<any> {
    return from(
      getNFTEntriesForPost({
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
    SenderPublicKeyBase58Check: string,
    ReceiverPublicKeyBase58Check: string,
    NFTPostHashHex: string,
    SerialNumber: number,
    UnencryptedUnlockableText: string,
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    let request = UnencryptedUnlockableText
      ? from(
          checkPartyAccessGroups({
            SenderAccessGroupKeyName: "default-key",
            RecipientAccessGroupKeyName: "default-key",
            SenderPublicKeyBase58Check: SenderPublicKeyBase58Check,
            RecipientPublicKeyBase58Check: ReceiverPublicKeyBase58Check,
          })
        ).pipe(
          switchMap((resp) => {
            const identityState = identity.snapshot();
            if (!identityState.currentUser) {
              throw new Error("No identityState.currentUser");
            }
            return from(
              encryptChatMessage(
                identityState.currentUser.primaryDerivedKey.messagingPrivateKey,
                resp.RecipientAccessGroupPublicKeyBase58Check,
                UnencryptedUnlockableText
              )
            );
          })
        )
      : of("");

    return request.pipe(
      switchMap((EncryptedUnlockableText) => {
        return from(
          transferNFT({
            SenderPublicKeyBase58Check,
            ReceiverPublicKeyBase58Check,
            NFTPostHashHex,
            SerialNumber,
            EncryptedUnlockableText,
            MinFeeRateNanosPerKB,
          })
        ).pipe(map(mergeTxResponse));
      })
    );
  }

  SubmitPost(
    UpdaterPublicKeyBase58Check: string,
    PostHashHexToModify: string,
    ParentStakeID: string,
    BodyObj: DeSoBodySchema,
    RepostedPostHashHex: string,
    PostExtraData: any,
    IsHidden: boolean,
    IsFrozen: boolean = false
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
        IsFrozen,
      }).then(mergeTxResponse)
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
    FetchAll: boolean = false,
    IsDAOCoin: boolean = false,
    SortType: HodlersSortType = HodlersSortType.coin_balance
  ): Observable<any> {
    return from(
      getHodlersForUser({
        PublicKeyBase58Check,
        Username,
        LastPublicKeyBase58Check,
        NumToFetch,
        FetchHodlings,
        FetchAll,
        IsDAOCoin,
        SortType,
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

  DeletePostAssociation(TransactorPublicKeyBase58Check: string, AssociationID: string) {
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
    AssociationValue?: AssociationValue | Array<AssociationValue>,
    IncludeTransactorProfile: boolean = false,
    Total: number = 0
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
        ASSOCIATIONS_PER_REQUEST_LIMIT,
        IncludeTransactorProfile
      ).pipe(
        tap(({ Associations }) => {
          receivedItems = [...receivedItems, ...Associations];
        })
      );
    };

    return fetchAssociationsChunk().pipe(
      expand(() => {
        if (receivedItems.length < Total) {
          return fetchAssociationsChunk(receivedItems[receivedItems.length - 1].AssociationID);
        }
        return EMPTY;
      }),
      reduce((acc, val) => ({
        Associations: [...acc.Associations, ...val.Associations],
        PublicKeyToProfileEntryResponse: {
          ...acc.PublicKeyToProfileEntryResponse,
          ...val.PublicKeyToProfileEntryResponse,
        },
        PostHashHexToPostEntryResponse: {
          ...acc.PostHashHexToPostEntryResponse,
          ...val.PostHashHexToPostEntryResponse,
        },
      }))
    );
  }

  GetPostAssociations(
    PostHashHex: string,
    AssociationType: AssociationType,
    TransactorPublicKeyBase58Check?: string,
    AssociationValues?: AssociationValue | AssociationValue[],
    LastSeenAssociationID?: string,
    Limit: number = 100,
    IncludeTransactorProfile: boolean = false
  ) {
    const isArray = AssociationValues && Array.isArray(AssociationValues);

    return from(
      getPostAssociations({
        TransactorPublicKeyBase58Check,
        PostHashHex,
        AssociationType: AssociationType,
        ...(isArray && { AssociationValues: AssociationValues as string[] }),
        ...(!isArray && AssociationValues && { AssociationValue: AssociationValues as string }),
        LastSeenAssociationID,
        Limit,
        IncludeTransactorProfile,
      })
    );
  }

  GetPostAssociationsCounts(
    Post: PostEntryResponse,
    AssociationType: AssociationType,
    AssociationValues: Array<AssociationValue>,
    SkipLegacyLikes: boolean = false
  ) {
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
    ).pipe(map(mergeTxResponse));
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
    return from(
      transferCreatorCoin(
        {
          SenderPublicKeyBase58Check,
          CreatorPublicKeyBase58Check,
          ReceiverUsernameOrPublicKeyBase58Check,
          CreatorCoinToTransferNanos: Math.floor(CreatorCoinToTransferNanos),
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
          nodeURI: "https://node.deso.org",
        }
      )
    );
  }

  SetNotificationsMetadata(
    PublicKeyBase58Check: string,
    LastSeenIndex: number,
    LastUnreadNotificationIndex: number,
    UnreadNotifications: number
  ): Observable<any> {
    return from(
      setNotificationMetadata(
        {
          PublicKeyBase58Check,
          LastSeenIndex,
          LastUnreadNotificationIndex,
          UnreadNotifications,
        },
        {
          nodeURI: "https://node.deso.org",
        }
      )
    );
  }

  GetUnreadNotificationsCount(PublicKeyBase58Check: string): Observable<any> {
    return from(
      getUnreadNotificationsCount(
        {
          PublicKeyBase58Check,
        },
        {
          nodeURI: "https://node.deso.org",
        }
      )
    );
  }

  GetAppState(PublicKeyBase58Check: string): Observable<any> {
    return from(
      getAppState({
        PublicKeyBase58Check,
      })
    );
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

  ResendVerifyEmail(PublicKey: string) {
    return from(
      resendVerifyEmail({
        PublicKey,
      })
    );
  }

  VerifyEmail(PublicKey: string, EmailHash: string): Observable<any> {
    return from(
      verifyEmail({
        PublicKey,
        EmailHash,
      })
    );
  }

  GetUserMetadata(PublicKeyBase58Check: string): Observable<GetUserMetadataResponse> {
    return from(getUserMetadata({ PublicKeyBase58Check }, { nodeURI: "https://node.deso.org" }));
  }

  AdminGetVerifiedUsers(): Observable<any> {
    return from(adminGetVerifiedUsers());
  }

  AdminGetUsernameVerificationAuditLogs(Username: string): Observable<any> {
    return from(
      adminGetUsernameVerificationAuditLog({
        Username,
      })
    );
  }

  AdminGrantVerificationBadge(UsernameToVerify: string): Observable<any> {
    return from(
      adminGrantVerificationBadge({
        UsernameToVerify,
      })
    );
  }

  AdminRemoveVerificationBadge(UsernameForWhomToRemoveVerification: string): Observable<any> {
    return from(
      adminRemoveVerificationBadge({
        UsernameForWhomToRemoveVerification,
      })
    );
  }

  AdminGetUserAdminData(UserPublicKeyBase58Check: string): Observable<any> {
    return from(
      adminGetUserAdminData({
        UserPublicKeyBase58Check,
      })
    );
  }

  NodeControl(Address: string, OperationType: string): Observable<any> {
    return from(
      adminNodeControl({
        Address,
        OperationType,
      })
    );
  }

  UpdateMiner(MinerPublicKeys: string): Observable<any> {
    return from(
      adminNodeControl({
        Address: "",
        MinerPublicKeys,
        OperationType: "update_miner",
      })
    );
  }

  AdminGetUserGlobalMetadata(UserPublicKeyBase58Check: string): Observable<any> {
    return from(
      adminGetUserGlobalMetadata({
        UserPublicKeyBase58Check,
      })
    );
  }

  AdminUpdateUserGlobalMetadata(
    UserPublicKeyBase58Check: string,
    Username: string,
    IsBlacklistUpdate: boolean,
    RemoveEverywhere: boolean,
    RemoveFromLeaderboard: boolean,
    IsWhitelistUpdate: boolean,
    WhitelistPosts: boolean,
    RemovePhoneNumberMetadata: boolean
  ): Observable<any> {
    return from(
      adminUpdateUserGlobalMetadata({
        UserPublicKeyBase58Check,
        Username,
        IsBlacklistUpdate,
        RemoveEverywhere,
        RemoveFromLeaderboard,
        IsWhitelistUpdate,
        WhitelistPosts,
        RemovePhoneNumberMetadata,
      })
    );
  }

  AdminGetAllUserGlobalMetadata(NumToFetch: number): Observable<any> {
    return from(
      adminGetAllUserGlobalMetadata({
        NumToFetch,
      })
    );
  }

  AdminPinPost(PostHashHex: string, UnpinPost: boolean): Observable<any> {
    return from(
      adminPinPost({
        PostHashHex,
        UnpinPost,
      })
    );
  }

  AdminUpdateGlobalFeed(PostHashHex: string, RemoveFromGlobalFeed: boolean): Observable<any> {
    return from(
      adminUpdateGlobalFeed({
        PostHashHex,
        RemoveFromGlobalFeed,
      })
    );
  }

  AdminRemoveNilPosts(NumPostsToSearch: number = 1000): Observable<any> {
    return from(
      adminRemoveNilPosts({
        NumPostsToSearch,
      })
    );
  }

  AdminReprocessBitcoinBlock(blockHashOrBlockHeight: string): Observable<any> {
    return from(adminReprocessBitcoinBlock(blockHashOrBlockHeight));
  }

  AdminGetMempoolStats(): Observable<any> {
    return from(adminGetMempoolStats());
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
      })
    );
  }

  GetBuyDeSoFeeBasisPoints(): Observable<any> {
    return from(adminGetBuyDesoFeeBasisPoints());
  }

  UpdateGlobalParams(
    UpdaterPublicKeyBase58Check: string,
    USDCentsPerBitcoin: number,
    CreateProfileFeeNanos: number,
    MinimumNetworkFeeNanosPerKB: number,
    MaxCopiesPerNFT: number,
    CreateNFTFeeNanos: number,
    MinFeeRateNanosPerKB: number
  ): Observable<any> {
    return from(
      adminUpdateGlobalParams({
        UpdaterPublicKeyBase58Check,
        USDCentsPerBitcoin,
        CreateProfileFeeNanos,
        MaxCopiesPerNFT,
        CreateNFTFeeNanos,
        MinimumNetworkFeeNanosPerKB,
        MinFeeRateNanosPerKB,
      })
    );
  }

  GetGlobalParams(): Observable<any> {
    return from(getGlobalParams());
  }

  AdminGetNFTDrop(DropNumber: number): Observable<any> {
    return from(
      adminGetNFTDrop({
        DropNumber,
      })
    );
  }

  AdminUpdateNFTDrop(
    DropNumber: number,
    DropTstampNanos: number,
    IsActive: boolean,
    NFTHashHexToAdd: string,
    NFTHashHexToRemove: string
  ): Observable<any> {
    return from(
      adminUpdateNFTDrop({
        DropNumber,
        DropTstampNanos,
        IsActive,
        NFTHashHexToAdd,
        NFTHashHexToRemove,
      })
    );
  }

  GetFullTikTokURL(TikTokShortVideoID: string): Observable<any> {
    return from(
      getFullTikTokURL({
        TikTokShortVideoID,
      })
    ).pipe(
      map((res) => {
        return res.FullTikTokURL;
      })
    );
  }

  AdminGetUnfilteredHotFeed(ResponseLimit: number, SeenPosts: Array<string>): Observable<any> {
    return from(
      adminGetUnfilteredHotFeed({
        ResponseLimit,
        SeenPosts,
      })
    );
  }

  AdminGetHotFeedAlgorithm(): Observable<any> {
    return from(adminGetHotFeedAlgorithm());
  }

  AdminUpdateHotFeedAlgorithm(
    InteractionCap: number,
    InteractionCapTag: number,
    TimeDecayBlocks: number,
    TimeDecayBlocksTag: number,
    TxnTypeMultiplierMap: { [txnType: number]: number }
  ): Observable<any> {
    return from(
      adminUpdateHotFeedAlgorithm({
        InteractionCap,
        InteractionCapTag,
        TimeDecayBlocks,
        TimeDecayBlocksTag,
        TxnTypeMultiplierMap,
      })
    );
  }

  AdminUpdateHotFeedPostMultiplier(PostHashHex: string, Multiplier: number): Observable<any> {
    return from(
      adminUpdateHotFeedPostMultiplier({
        PostHashHex,
        Multiplier,
      })
    );
  }

  AdminUpdateHotFeedUserMultiplier(
    Username: string,
    InteractionMultiplier: number,
    PostsMultiplier: number
  ): Observable<any> {
    return from(
      adminUpdateHotFeedUserMultiplier({
        Username,
        InteractionMultiplier,
        PostsMultiplier,
      })
    );
  }

  AdminGetHotFeedUserMultiplier(Username: string): Observable<any> {
    return from(
      adminGetHotFeedUserMultiplier({
        Username,
      })
    );
  }

  /**
   * This is for the legacy tutorial thing. I don't *think* we can remove it
   * since I think we still need it to set the users tutorial status to
   * complete. I forget whether the backend already does this or not.
   */
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

  GetWyreWalletOrderForPublicKey(PublicKeyBase58Check: string, Username: string): Observable<any> {
    return from(
      adminGetWyreWalletOrdersForUser({
        PublicKeyBase58Check,
        Username,
      })
    );
  }

  // Wyre
  GetWyreWalletOrderQuotation(SourceAmount: number, Country: string, SourceCurrency: string): Observable<any> {
    return from(
      adminGetWyreWalletOrderQuotation({
        SourceAmount,
        Country,
        SourceCurrency,
      })
    );
  }

  GetWyreWalletOrderReservation(
    ReferenceId: string,
    SourceAmount: number,
    Country: string,
    SourceCurrency: string
  ): Observable<any> {
    return from(
      adminGetWyreWalletOrderReservation({
        ReferenceId,
        SourceAmount,
        Country,
        SourceCurrency,
      })
    );
  }

  // Tutorial Endpoints
  StartOrSkipTutorial(endpoint: string, PublicKeyBase58Check: string, IsSkip: boolean): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathStartOrSkipTutorial, PublicKeyBase58Check, {
      PublicKeyBase58Check,
      IsSkip,
    });
  }

  CompleteTutorial(endpoint: string, PublicKeyBase58Check: string): Observable<any> {
    return this.jwtPost(endpoint, BackendRoutes.RoutePathCompleteTutorial, PublicKeyBase58Check, {
      PublicKeyBase58Check,
    });
  }

  GetVideoStatus(videoId: string): Observable<any> {
    return from(getVideoStatus({ videoId }));
  }

  GetLinkPreview(url: string): Observable<any> {
    return from(getLinkPreview(url));
  }

  ConstructProxyImageUrl(url: string): string {
    return buildProxyImageURL(url);
  }

  // Error parsing
  stringifyError(err): string {
    return err.toString() || JSON.stringify(err);
  }

  parseErrorMessage(err): string {
    if (err.status === 0) {
      return `${environment.node.name} is experiencing heavy load. Please try again in one minute.`;
    }

    if (err?.message) {
      return parseCleanErrorMsg(err.message);
    }

    return JSON.stringify(err);
  }
}

function mergeTxResponse({ constructedTransactionResponse, submittedTransactionResponse }) {
  return { ...constructedTransactionResponse, ...submittedTransactionResponse };
}
