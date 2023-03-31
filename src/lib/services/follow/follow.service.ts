import { Injectable } from "@angular/core";
import { TrackingService } from "src/app/tracking.service";
import { BackendApiService } from "../../../app/backend-api.service";
import { GlobalVarsService } from "../../../app/global-vars.service";
import { FollowChangeObservableResult } from "../../observable-results/follow-change-observable-result";
import { catchError, finalize, tap } from "rxjs/operators";
import { of } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class FollowService {
  constructor(
    private globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private appData: GlobalVarsService,
    private tracking: TrackingService
  ) {}

  RULE_ERROR_FOLLOW_ENTRY_ALREADY_EXISTS = "RuleErrorFollowEntryAlreadyExists";
  RULE_ERROR_CANNOT_UNFOLLOW_NONEXISTENT_FOLLOW_ENTRY = "RuleErrorCannotUnfollowNonexistentFollowEntry";
  createFollowTxnBeingCalled = false;
  isFollowing: boolean;

  _isLoggedInUserFollowing(followedPubKeyBase58Check: string) {
    if (!this.appData.loggedInUser?.PublicKeysBase58CheckFollowedByUser) {
      return false;
    }

    return this.appData.loggedInUser.PublicKeysBase58CheckFollowedByUser.includes(followedPubKeyBase58Check);
  }

  _toggleFollow(isFollow: boolean, followedPubKeyBase58Check: string) {
    if (this.createFollowTxnBeingCalled) {
      return;
    }

    let followerPublicKeyBase58Check = this.appData.loggedInUser.PublicKeyBase58Check;

    this.createFollowTxnBeingCalled = true;

    return this.backendApi
      .CreateFollowTxn(followerPublicKeyBase58Check, followedPubKeyBase58Check, !isFollow /*isUnfollow*/)
      .pipe(
        tap(() => {
          this._handleSuccessfulFollowTxn(isFollow, followedPubKeyBase58Check);
          this._notifyFollowChangeObservers(followedPubKeyBase58Check);
        }),
        catchError((error) => {
          let errorString = error.error.error || "";
          if (errorString.includes(this.RULE_ERROR_FOLLOW_ENTRY_ALREADY_EXISTS)) {
            // If the user is already following, then set our button to reflect that.
            // Note: a common way this can currently happen is if there are multiple
            // follow buttons on the same page for the same user. TODO: fix this
            this._handleSuccessfulFollow(followedPubKeyBase58Check);
          } else if (errorString.includes(this.RULE_ERROR_CANNOT_UNFOLLOW_NONEXISTENT_FOLLOW_ENTRY)) {
            // If the user is already not following, then set our button to reflect that.
            this._handleSuccessfulUnfollow(followedPubKeyBase58Check);
          } else {
            // TODO: RuleErrorInputSpendsNonexistentUtxo is a problem ... we need a lock in the server endpoint
            // TODO: there's prob some "out of funds" error which is a problem
            const parsedError = this.backendApi.parseMessageError(error);
            this.tracking.log(`profile : ${isFollow ? "follow" : "unfollow"}`, { error: parsedError });
            this.appData._alertError(parsedError, !!parsedError.indexOf("insufficient"));
          }

          return of();
        }),
        finalize(() => {
          this.createFollowTxnBeingCalled = false;
        })
      );
  }

  _handleSuccessfulFollowTxn(isFollow: boolean, followedPubKeyBase58Check: string) {
    if (isFollow) {
      this._handleSuccessfulFollow(followedPubKeyBase58Check);
    } else {
      this._handleSuccessfulUnfollow(followedPubKeyBase58Check);
    }
  }

  _handleSuccessfulFollow(followedPubKeyBase58Check: string) {
    this.tracking.log("profile : follow", { targetPublicKey: followedPubKeyBase58Check });

    // add to the list of follows (keep the global list correct)
    let publicKeys = this.appData.loggedInUser.PublicKeysBase58CheckFollowedByUser;
    let index = publicKeys.indexOf(followedPubKeyBase58Check);
    if (index == -1) {
      publicKeys.push(followedPubKeyBase58Check);
      // we keep the array sorted since app.component.ts does the following
      // to determine whether any user fields are changed:
      //   (JSON.stringify(this.appData.loggedInUser) !== JSON.stringify(loggedInUserFound))
      publicKeys.sort();
    } else {
      // Note: this "unexpected" index can happen on the global feed if the user clicks
      // separate follow buttons on multiple feed items by the same person at the same time
      console.error(`_handleSuccessfulUnfollow: unexpected index: ${index}`);
    }
    this.isFollowing = true;
  }

  _handleSuccessfulUnfollow(followedPubKeyBase58Check: string) {
    this.tracking.log("profile : unfollow", { targetPublicKey: followedPubKeyBase58Check });

    // remove from the list of follows (keep the global list correct)
    let publicKeys = this.appData.loggedInUser.PublicKeysBase58CheckFollowedByUser;
    let index = publicKeys.indexOf(followedPubKeyBase58Check);
    if (index > -1) {
      publicKeys.splice(index, 1);
      publicKeys.sort();
    } else {
      // Note: this "unexpected" index can happen on the global feed if the user clicks
      // separate unfollow buttons on multiple feed items by the same person at the same time
      console.error(`_handleSuccessfulUnfollow: unexpected index: ${index}`);
    }
    this.isFollowing = false;
  }

  // Note: only the follow button that calls CreateFollowTxn should notify. Any
  // other buttons that update their state should not notify.
  _notifyFollowChangeObservers(followedPubKeyBase58Check: string) {
    this.appData.followChangeObservers.forEach((observer) => {
      let result = new FollowChangeObservableResult();
      result.isFollowing = this.isFollowing;
      result.followedPubKeyBase58Check = followedPubKeyBase58Check;
      observer.next(result);
    });
  }
}
