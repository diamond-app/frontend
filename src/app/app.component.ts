import { ChangeDetectorRef, Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { configure, identity, User } from "deso-protocol";
import { Identity } from "deso-protocol/src/identity/identity";
import * as introJs from "intro.js/intro.js";
import isEqual from "lodash/isEqual";
import isNil from "lodash/isNil";
import { BsModalService } from "ngx-bootstrap/modal";
import { of, Subscription, zip } from "rxjs";
import { catchError } from "rxjs/operators";
import { environment } from "../environments/environment";
import { BackendApiService } from "./backend-api.service";
import { GlobalVarsService } from "./global-vars.service";
import { IdentityMigrationModalComponent } from "./identity-migration-modal/identity-migration-modal.component";
import { ThemeService } from "./theme/theme.service";
import { TrackingService } from "./tracking.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  constructor(
    private ref: ChangeDetectorRef,
    private themeService: ThemeService,
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute,
    private router: Router,
    private tracking: TrackingService,
    private modalService: BsModalService
  ) {
    this.globalVars.Init(
      null, // loggedInUser
      [], // userList
      this.route // route
    );

    // NOTE: The deso-protocol configure call has to come *after* globalVars
    // Init because it uses globalVars.localNode. There is no practical reason
    // we need to store the localNode value in globalVars (or local storage),
    // but it's an annoying and unrelated thing to refactor right now...
    const nodeURI = this.globalVars.localNode.startsWith("http")
      ? this.globalVars.localNode
      : `https://${this.globalVars.localNode}`;
    configure({
      identityURI: environment.identityURL,
      nodeURI,
      mediaURI: `https://${environment.uploadVideoHostname}`,
      spendingLimitOptions: {
        GlobalDESOLimit: 1e9,
        TransactionCountLimitMap: {
          UPDATE_PROFILE: "UNLIMITED",
          CREATE_NFT: "UNLIMITED",
          UPDATE_NFT: "UNLIMITED",
          SUBMIT_POST: "UNLIMITED",
          NEW_MESSAGE: "UNLIMITED",
          BASIC_TRANSFER: "UNLIMITED",
          FOLLOW: "UNLIMITED",
          LIKE: "UNLIMITED",
          CREATOR_COIN: "UNLIMITED",
          CREATOR_COIN_TRANSFER: "UNLIMITED",
          ACCEPT_NFT_BID: "UNLIMITED",
          BURN_NFT: "UNLIMITED",
          CREATE_USER_ASSOCIATION: "UNLIMITED",
          CREATE_POST_ASSOCIATION: "UNLIMITED",
          ACCESS_GROUP: "UNLIMITED",
          ACCESS_GROUP_MEMBERS: "UNLIMITED",
        },
        CreatorCoinOperationLimitMap: {
          "": { any: "UNLIMITED" },
        },
        AssociationLimitMap: [
          {
            AssociationClass: "Post",
            AssociationType: "",
            AppScopeType: "Any",
            AppPublicKeyBase58Check: "",
            AssociationOperation: "Any",
            OpCount: "UNLIMITED",
          },
          {
            AssociationClass: "User",
            AssociationType: "",
            AppPublicKeyBase58Check: "",
            AppScopeType: "Any",
            AssociationOperation: "Any",
            OpCount: "UNLIMITED",
          },
        ],
        AccessGroupLimitMap: [
          {
            AccessGroupOwnerPublicKeyBase58Check: "",
            ScopeType: "Any",
            AccessGroupKeyName: "",
            OperationType: "Any",
            OpCount: "UNLIMITED",
          },
        ],
        AccessGroupMemberLimitMap: [
          {
            AccessGroupOwnerPublicKeyBase58Check: "",
            ScopeType: "Any",
            AccessGroupKeyName: "",
            OperationType: "Any",
            OpCount: "UNLIMITED",
          },
        ],
        NFTOperationLimitMap: {
          "": { 0: { any: "UNLIMITED" } },
        },
      },
      MinFeeRateNanosPerKB: 1000,
      network: this.globalVars.getDesoNetworkFromURL(nodeURI),
      appName: "Diamond App",
    });

    // log interaction events emitted by identity
    window.addEventListener("message", (ev) => {
      if (!(ev.origin === environment.identityURL && ev.data?.category === "interaction-event")) return;
      const { object, event, data } = ev.data.payload;
      this.tracking.log(`identity : ${object} : ${event}`, data);
    });
  }
  static DYNAMICALLY_ADDED_ROUTER_LINK_CLASS = "js-app-component__dynamically-added-router-link-class";

  // Throttle the calls to update the top-level data so they only happen after a
  // previous call has finished.
  callingUpdateTopLevelData = false;
  problemWithNodeConnection = false;
  callingUpdateNodeInfo = false;

  // TODO: Cleanup - we should not be inserting links dynamically
  // This is used to add router links dynamically. Feed posts use this
  // to turn @-mentions into links.
  // See https://stackoverflow.com/a/62783788 for more info
  @HostListener("document:click", ["$event"])
  public handleClick(event: Event): void {
    if (event.target instanceof HTMLAnchorElement) {
      const element = event.target as HTMLAnchorElement;
      if (element.className === AppComponent.DYNAMICALLY_ADDED_ROUTER_LINK_CLASS) {
        event.preventDefault();

        if (!element) {
          return;
        }

        const route = element.getAttribute("href");
        if (route) {
          // FYI, this seems to give a js error if the route isn't in our list
          // of routes, which should help prevent attackers from tricking users into
          // clicking misleading links
          this.router.navigate([route], { queryParamsHandling: "merge" });
        }
      }
    }
  }

  // This stringifies the user object after first zeroing out fields that make
  // comparisons problematic.
  _cleanStringifyUser(user: any) {
    const userCopy = JSON.parse(JSON.stringify(user));
  }

  _updateTopLevelData(): Subscription {
    if (this.callingUpdateTopLevelData) {
      return new Subscription();
    }

    this.callingUpdateTopLevelData = true;

    const { currentUser } = (identity as Identity<Storage>).snapshot();

    return zip(
      this.backendApi.GetUsersStateless([currentUser?.publicKey], false),
      environment.verificationEndpointHostname && !isNil(currentUser?.publicKey)
        ? this.backendApi.GetUserMetadata(currentUser?.publicKey).pipe(
            catchError((err) => {
              console.error(err);
              return of(null);
            })
          )
        : of(null)
    ).subscribe(
      ([res, userMetadata]) => {
        this.problemWithNodeConnection = false;
        this.callingUpdateTopLevelData = false;

        let loggedInUser: User = res.UserList[0];
        let loggedInUserFound: boolean = false;
        // Find the logged in user in the user list and replace it with the logged in user from this GetUsersStateless call.
        this.globalVars.userList.forEach((user, index) => {
          if (user.PublicKeyBase58Check === loggedInUser.PublicKeyBase58Check) {
            loggedInUserFound = true;
            this.globalVars.userList[index] = loggedInUser;
            // This breaks out of the lodash foreach.
            return false;
          }
        });

        // If we got user metadata from some external global state, let's overwrite certain attributes of the logged in user.
        if (userMetadata) {
          loggedInUser.HasPhoneNumber = userMetadata.HasPhoneNumber;
          loggedInUser.CanCreateProfile = userMetadata.CanCreateProfile;
          loggedInUser.JumioVerified = userMetadata.JumioVerified;
          loggedInUser.JumioFinishedTime = userMetadata.JumioFinishedTime;
          loggedInUser.JumioReturned = userMetadata.JumioReturned;
          // We can merge the blocked public key maps, which means we effectively block the union of public keys from both endpoints.
          loggedInUser.BlockedPubKeys = { ...loggedInUser.BlockedPubKeys, ...userMetadata.BlockedPubKeys };
          // Even though we have EmailVerified and HasEmail, we don't overwrite email attributes since each app may want to gather emails on their own.
        }
        // If the logged-in user wasn't in the list, add it to the list.
        if (!loggedInUserFound && currentUser?.publicKey) {
          this.globalVars.userList.push(loggedInUser);
        }
        // Only call setLoggedInUser if logged in user has changed.
        if (!isEqual(this.globalVars.loggedInUser, loggedInUser) && currentUser?.publicKey) {
          this.globalVars.setLoggedInUser(loggedInUser);
        }

        // Get unread notifications for the logged in user
        this.globalVars.GetUnreadNotifications();

        // Convert the lists of coin balance entries into maps.
        // TODD: I've intermittently seen errors here where UsersYouHODL is null.
        // That's why I added this || [] thing. We should figure
        // out the root cause.
        for (const entry of this.globalVars.loggedInUser?.UsersYouHODL || []) {
          this.globalVars.youHodlMap[entry.CreatorPublicKeyBase58Check] = entry;
        }

        if (res.DefaultFeeRateNanosPerKB > 0) {
          this.globalVars.defaultFeeRateNanosPerKB = res.DefaultFeeRateNanosPerKB;
        }
        this.globalVars.paramUpdaters = res.ParamUpdaters;

        this.ref.detectChanges();
        this.globalVars.loadingInitialAppState = false;
      },
      (error) => {
        this.problemWithNodeConnection = true;
        this.callingUpdateTopLevelData = false;
        this.globalVars.loadingInitialAppState = false;
        console.error(error);
      }
    );
  }

  _updateDeSoExchangeRate() {
    this.globalVars._updateDeSoExchangeRate();
  }

  _updateAppState() {
    this.backendApi.GetAppState(this.globalVars.loggedInUser?.PublicKeyBase58Check).subscribe((res: any) => {
      this.globalVars.minSatoshisBurnedForProfileCreation = res.MinSatoshisBurnedForProfileCreation;
      this.globalVars.diamondLevelMap = res.DiamondLevelMap;
      this.globalVars.showProcessingSpinners = res.ShowProcessingSpinners;
      this.globalVars.showBuyWithUSD = res.HasWyreIntegration;
      this.globalVars.showJumio = res.HasJumioIntegration;
      this.globalVars.jumioDeSoNanos = res.JumioDeSoNanos;
      this.globalVars.isTestnet = res.IsTestnet;
      this.globalVars.showPhoneNumberVerification = res.HasTwilioAPIKey && res.HasStarterDeSoSeed;
      this.globalVars.createProfileFeeNanos = res.CreateProfileFeeNanos;
      this.globalVars.isCompProfileCreation = this.globalVars.showPhoneNumberVerification && res.CompProfileCreation;
      this.globalVars.buyETHAddress = res.BuyETHAddress;
      this.globalVars.nodes = res.Nodes;
    });
  }

  _updateEverything = (
    waitTxn: string = "",
    successCallback: (comp: any) => void = () => {},
    errorCallback: (comp: any) => void = () => {},
    comp: any = ""
  ) => {
    // Refresh the messageMeta periodically.
    this.globalVars.messageMeta = this.backendApi.GetStorage(this.backendApi.MessageMetaKey);
    if (!this.globalVars.messageMeta) {
      this.globalVars.messageMeta = {
        decryptedMessgesMap: {},
        notificationMap: {},
      };
    }

    // If we have a transaction to wait for, we do a GetTxn call for a maximum of 10s (250ms * 40).
    // There is a success and error callback so that the caller gets feedback on the polling.
    if (waitTxn !== "") {
      let attempts = 0;
      let numTries = 160;
      let timeoutMillis = 750;
      // Set an interval to repeat
      let interval = setInterval(() => {
        if (attempts >= numTries) {
          errorCallback(comp);
          clearInterval(interval);
        }
        this.backendApi
          .GetTxn(waitTxn)
          .subscribe(
            (res: any) => {
              if (!res.TxnFound) {
                return;
              }
              this._updateDeSoExchangeRate();
              this._updateAppState();

              this._updateTopLevelData().add(() => {
                // We make sure the logged in user is updated before the success callback triggers
                successCallback(comp);
                clearInterval(interval);
              });
            },
            (error) => {
              clearInterval(interval);
              errorCallback(comp);
            }
          )
          .add(() => attempts++);
      }, timeoutMillis) as any;
    } else {
      if (this.globalVars.pausePolling) {
        return;
      }
      this._updateDeSoExchangeRate();
      this._updateAppState();
      return this._updateTopLevelData();
    }
  };

  preventScroll(event) {
    if (this.globalVars.userIsDragging) {
      event.preventDefault();
    }
  }

  ngOnInit() {
    // Load the theme
    this.themeService.init();

    // Update the DeSo <-> Bitcoin exchange rate every five minutes. This prevents
    // a stale price from showing in a tab that's been open for a while
    setInterval(() => {
      this._updateDeSoExchangeRate();
    }, 5 * 60 * 1000);

    this.globalVars.updateEverything = this._updateEverything;

    // We need to fetch this data before we start an import. Can remove once import code is gone.
    this._updateDeSoExchangeRate();
    this._updateAppState();

    this.loadApp();

    this.globalVars.pollUnreadNotifications();

    this.installDD();
    introJs().start();
  }

  loadApp() {
    // Load service worker for push notifications.
    this.globalVars.initializeWebPush();
    const { currentUser, alternateUsers } = (identity as Identity<Storage>).snapshot();
    this.tracking.log("page : load", { isLoggedIn: !!currentUser });

    let publicKeys = [];
    if (currentUser?.publicKey) {
      publicKeys.push(currentUser?.publicKey);
    }
    if (alternateUsers) {
      publicKeys.push(...Object.keys(alternateUsers));
    }
    this.backendApi.GetUsersStateless(publicKeys, true).subscribe((res) => {
      if (!isEqual(this.globalVars.userList, res.UserList)) {
        this.globalVars.userList = res.UserList || [];
      }
      this.globalVars.updateEverything();
    });

    // Clean up legacy seedinfo storage. only called when a user visits the site again after a successful import
    this.backendApi.DeleteIdentities(this.globalVars.localNode).subscribe();
    this.backendApi.RemoveStorage(this.backendApi.LegacyUserListKey);
    this.backendApi.RemoveStorage(this.backendApi.LegacySeedListKey);

    // Shows a message if the user was logged in via the legacy identity flow
    // letting them know they will need to log in again.
    if (!currentUser && window.localStorage.getItem("lastLoggedInUser")) {
      this.modalService.show(IdentityMigrationModalComponent, {
        class: "modal-dialog-centered buy-deso-modal",
      });
    }
  }

  installDD() {
    const { apiKey, jsPath, ajaxListenerPath, endpoint } = environment.dd;
    if (!apiKey || !jsPath || !ajaxListenerPath || !endpoint) {
      return;
    }

    // @ts-ignore
    window.ddjskey = apiKey;
    // @ts-ignore
    window.ddoptions = { ajaxListenerPath, endpoint };

    const datadomeScript = document.createElement("script");
    const firstScript = document.getElementsByTagName("script")[0];
    datadomeScript.async = true;
    datadomeScript.src = jsPath;
    firstScript.parentNode.insertBefore(datadomeScript, firstScript);
  }
}
