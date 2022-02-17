import { Component, OnInit, Input, OnChanges, AfterViewInit } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { ActivatedRoute, Router } from "@angular/router";
import { BackendApiService, TutorialStatus } from "../../backend-api.service";
import { SwalHelper } from "../../../lib/helpers/swal-helper";
import { AppRoutingModule, RouteNames } from "../../app-routing.module";
import { Title } from "@angular/platform-browser";
import { BsModalRef } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";

export type ProfileUpdates = {
  usernameUpdate: string;
  descriptionUpdate: string;
  profilePicUpdate: string;
};

export type ProfileUpdateErrors = {
  usernameError: boolean;
  descriptionError: boolean;
  profilePicError: boolean;
  founderRewardError: boolean;
};

@Component({
  selector: "feed-create-post-modal",
  templateUrl: "./feed-create-post-modal.component.html",
  styleUrls: ["./feed-create-post-modal.component.scss"],
})
export class FeedCreatePostModalComponent implements AfterViewInit {
  @Input() loggedInUser: any;
  @Input() inTutorial: boolean = false;

  updateProfileBeingCalled: boolean = false;
  descriptionInput: string;
  profileUpdates: ProfileUpdates = {
    usernameUpdate: "",
    descriptionUpdate: "",
    profilePicUpdate: "",
  };
  profileUpdateErrors: ProfileUpdateErrors = {
    usernameError: false,
    descriptionError: false,
    profilePicError: false,
    founderRewardError: false,
  };
  profileUpdated = false;
  warnBeforeClose: boolean = false;

  constructor(
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private router: Router,
    public bsModalRef: BsModalRef,
    private toastr: ToastrService
  ) {}

  onPostCreated(postEntryResponse) {
    const link = `/${this.globalVars.RouteNames.POSTS}/${postEntryResponse.PostHashHex}`;
    this.toastr.show(`Post Created<a href="${link}" class="toast-link cursor-pointer">View</a>`, null, {
      toastClass: "info-toast",
      enableHtml: true,
      positionClass: "toast-bottom-center",
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const searchElement = document.querySelector("feed-create-post-modal .feed-create-post__textarea");
      // @ts-ignore
      searchElement.focus();
    }, 0);
  }

  postUpdated(postNotEmpty: boolean) {
    console.log(postNotEmpty);
    this.warnBeforeClose = postNotEmpty;
  }

  closeModal() {
    if (this.warnBeforeClose) {
      SwalHelper.fire({
        target: this.globalVars.getTargetComponentSelector(),
        title: `Discard Changes?`,
        html: `Are you sure you want to discard changes to your post and exit?`,
        showCancelButton: true,
        showConfirmButton: true,
        focusConfirm: true,
        customClass: {
          confirmButton: "btn btn-light",
          cancelButton: "btn btn-light no",
        },
        confirmButtonText: "Yes",
        cancelButtonText: "No",
        reverseButtons: true,
      }).then((res: any) => {
        if (res.isConfirmed) {
          this.bsModalRef.hide();
        }
      });
    } else {
      this.bsModalRef.hide();
    }
  }
}
