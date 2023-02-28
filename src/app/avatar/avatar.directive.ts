import { Directive, ElementRef, Input, OnChanges } from "@angular/core";
import * as _ from "lodash";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";

@Directive({
  selector: "[avatar]",
})
export class AvatarDirective implements OnChanges {
  @Input() avatar: string = "";
  @Input() nftProfileUrl: string = "";

  constructor(private globalVars: GlobalVarsService, private backendApi: BackendApiService, private el: ElementRef) {}

  setAvatar() {
    if (this.nftProfileUrl && this.nftProfileUrl !== "") {
      this.setURLOnElement(this.nftProfileUrl);
      return;
    }

    // If fetching the avatar for the current user, use the last timestamp of profile update to bust
    // the cache so we get the updated avatar.
    let cacheBuster = "";
    if (
      this.globalVars?.loggedInUser &&
      this.avatar === this.globalVars.loggedInUser?.PublicKeyBase58Check &&
      this.globalVars.profileUpdateTimestamp
    ) {
      cacheBuster = `&${this.globalVars.profileUpdateTimestamp}`;
    }

    // Although it would be hard for an attacker to inject a malformed public key into the app,
    // we do a basic _.escape anyways just to be extra safe.
    const profPicURL = _.escape(this.backendApi.GetSingleProfilePictureURL(this.avatar));

    // Set the URL on the element.
    this.setURLOnElement(profPicURL + cacheBuster);
  }

  ngOnChanges(changes: any) {
    if (changes.avatar && changes.avatar !== this.avatar) {
      this.setAvatar();
    }
  }

  setURLOnElement(profilePicURL: string) {
    this.el.nativeElement.style.backgroundImage = `url(${profilePicURL})`;
  }
}
