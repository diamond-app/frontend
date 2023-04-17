// @ts-strict
import { CdkTextareaAutosize } from "@angular/cdk/text-field";
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslocoService } from "@ngneat/transloco";
import { pollForVideoReady, PostEntryResponse, ProfileEntryResponse, uploadVideo } from "deso-protocol";
import * as _ from "lodash";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import { GlobalVarsService } from "src/app/global-vars.service";
import { TrackingService } from "src/app/tracking.service";
import { WelcomeModalComponent } from "src/app/welcome-modal/welcome-modal.component";
import { environment } from "../../../environments/environment";
import { EmbedUrlParserService } from "../../../lib/services/embed-url-parser-service/embed-url-parser-service";
import { Mentionify } from "../../../lib/services/mention-autofill/mentionify";
import { SharedDialogs } from "../../../lib/shared-dialogs";
import { BackendApiService } from "../../backend-api.service";
import {
  AbstractControl,
  UntypedFormArray,
  UntypedFormControl,
  UntypedFormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";

const RANDOM_MOVIE_QUOTES = [
  "feed_create_post.quotes.quote1",
  "feed_create_post.quotes.quote2",
  "feed_create_post.quotes.quote3",
  "feed_create_post.quotes.quote4",
  "feed_create_post.quotes.quote5",
  "feed_create_post.quotes.quote6",
  "feed_create_post.quotes.quote7",
  "feed_create_post.quotes.quote8",
  "feed_create_post.quotes.quote9",
  "feed_create_post.quotes.quote10",
  "feed_create_post.quotes.quote11",
  "feed_create_post.quotes.quote12",
  "feed_create_post.quotes.quote13",
  "feed_create_post.quotes.quote14",
  "feed_create_post.quotes.quote15",
  "feed_create_post.quotes.quote16",
  "feed_create_post.quotes.quote17",
  "feed_create_post.quotes.quote18",
];

class PostModel {
  text = "";
  postImageSrc = "";
  postVideoSrc = "";
  assetId = "";
  embedURL = "";
  constructedEmbedURL = "";
  showEmbedURL = false;
  showImageLink = false;
  showPoll = false;
  isMentionified = false;
  placeHolderText: string;
  isUploadingMedia = false;
  isProcessingMedia = false;
  editPostHashHex = "";
  pollForm: UntypedFormGroup = new UntypedFormGroup({
    options: new UntypedFormArray([]),
  });
  pollType: PollWeightType = PollWeightType.unweighted;
  pollWeightTokenProfile: ProfileEntryResponse | null = null;
  private quotes = RANDOM_MOVIE_QUOTES.slice();

  /**
   * @param post optional initial post data (used for editing posts)
   */
  constructor(post?: PostEntryResponse) {
    if (post) {
      this.text = post.Body;
      this.postImageSrc = post.ImageURLs?.[0] ?? "";
      this.postVideoSrc = post.VideoURLs?.[0] ?? "";
      this.constructedEmbedURL = post.PostExtraData.EmbedVideoURL ?? "";
      this.embedURL = this.constructedEmbedURL;
      this.editPostHashHex = post.PostHashHex;
    }

    this.placeHolderText = this.getRandomMoveQuote();
  }

  /**
   * Gets a new random quote for each new post in a multi-post thread. Ensures
   * we don't see duplicates until after all quotes have been exhuasted.
   */
  private getRandomMoveQuote() {
    if (this.quotes.length === 0) {
      this.quotes = RANDOM_MOVIE_QUOTES.slice();
    }

    const randomQuoteIndex = Math.floor(Math.random() * this.quotes.length);
    const [quote] = this.quotes.splice(randomQuoteIndex, 1);

    return quote;
  }
}

export enum PollWeightType {
  unweighted = "unweighted",
  desoBalance = "deso_balance",
  desoTokenBalance = "deso_token_balance",
}

interface PostExtraData {
  EmbedVideoURL?: string;
  Node?: string;
  Language?: string;
  LivepeerAssetId?: string;
  PollOptions?: string; // saving it as string since the API cannot save the array structure in PostExtraData
  PollExpirationBlockHeight?: string; // this field is ignored for now
  PollWeightType?: PollWeightType;
  PollWeightTokenPublicKey?: string;
}

@Component({
  selector: "feed-create-post",
  templateUrl: "./feed-create-post.component.html",
  styleUrls: ["./feed-create-post.component.scss"],
})
export class FeedCreatePostComponent implements OnInit {
  isReply = false;
  submittingPost = false;
  postModels: PostModel[] = [];
  currentPostModel = new PostModel();
  videoUploadPercentage: string | null = null;
  postSubmitPercentage: string | null = null;
  globalVars: GlobalVarsService;
  submittedPost: PostEntryResponse | null = null;
  embedUrlParserService = EmbedUrlParserService;

  readonly REQUIRED_POLL_OPTIONS: number = 2;
  readonly MAX_POLL_OPTIONS: number = 5;
  readonly MAX_POLL_CHARACTERS: number = 50;
  readonly POLL_WEIGHT_TYPE_LABELS = {
    [PollWeightType.unweighted]: "Simple poll",
    [PollWeightType.desoBalance]: "Weight By DeSo Balance",
    [PollWeightType.desoTokenBalance]: "Weight By Token Balance",
  };
  readonly POLL_WEIGHT_TYPE_LABELS_SELECTED = {
    [PollWeightType.unweighted]: "Simple poll",
    [PollWeightType.desoBalance]: "DeSo Balance",
    [PollWeightType.desoTokenBalance]: "Token Balance",
  };
  readonly POLL_WEIGHT_TYPE = PollWeightType;

  @Input() postRefreshFunc: any = null;
  @Input() numberOfRowsInTextArea: number = 2;
  @Input() parentPost: PostEntryResponse | null = null;
  @Input() isQuote = false;
  @Input() inTutorial = false;
  @Input() inModal = false;
  @Input() onCreateBlog?: () => void;
  @Input() postToEdit?: PostEntryResponse;
  @Input() modalRef?: BsModalRef;
  @Output() postUpdated = new EventEmitter<boolean>();
  @Output() postCreated = new EventEmitter<PostEntryResponse>();

  @ViewChildren("autosizables") autosizables: QueryList<CdkTextareaAutosize> | undefined;
  @ViewChildren("textareas") textAreas: QueryList<ElementRef<HTMLTextAreaElement>> | undefined;
  @ViewChildren("menus") menus: QueryList<ElementRef<HTMLDivElement>> | undefined;
  // Ref is used only to `.focus()` an poll input from TypeScript.
  // The rest of operations should go through the ReactiveForms
  @ViewChildren("pollOptionsRef") pollOptionsRef: QueryList<ElementRef<HTMLInputElement>> | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private changeRef: ChangeDetectorRef,
    private appData: GlobalVarsService,
    private translocoService: TranslocoService,
    private modalService: BsModalService,
    private tracking: TrackingService
  ) {
    this.globalVars = appData;
  }

  // Functions for the mention autofill component
  resolveFn = (prefix: string) => this.getUsersFromPrefix(prefix);

  get pollOptions() {
    return this.currentPostModel.pollForm.controls.options as UntypedFormArray;
  }

  async getUsersFromPrefix(prefix: string): Promise<ProfileEntryResponse[]> {
    const profiles = await this.backendApi
      .GetProfiles(
        "" /*PublicKeyBase58Check*/,
        "" /*Username*/,
        prefix.trim().replace(/^@/, "") /*UsernamePrefix*/,
        "" /*Description*/,
        "influencer_coin_price" /*Order by*/,
        5 /*NumToFetch*/,
        this.globalVars.loggedInUser?.PublicKeyBase58Check /*ReaderPublicKeyBase58Check*/,
        "" /*ModerationType*/,
        false /*FetchUsersThatHODL*/,
        false /*AddGlobalFeedBool*/
      )
      .toPromise();
    return profiles.ProfilesFound as ProfileEntryResponse[];
  }

  // Create and format the item in the dropdown
  menuItemFn = (user: ProfileEntryResponse, setItem: () => void, selected: boolean) => {
    const div = document.createElement("div");
    div.setAttribute("role", "option");
    div.className = "menu-item";
    if (selected) {
      div.classList.add("selected");
      div.setAttribute("aria-selected", "");
    }

    // Although it would be hard for an attacker to inject a malformed public key into the app,
    // we do a basic _.escape anyways just to be extra safe.
    const profPicURL = _.escape(this.backendApi.GetSingleProfilePictureURL(user.PublicKeyBase58Check));
    div.innerHTML = `
      <div class="d-flex align-items-center">
        <img src="${profPicURL}" height="30px" width="30px" style="border-radius: 10px" class="mr-5px">
        <p>${_.escape(user.Username)}</p>
        ${user.IsVerified ? `<i class="fas fa-check-circle fa-md ml-5px fc-blue"></i>` : ""}
      </div>`;
    div.onclick = setItem;
    return div;
  };

  replaceFn = (user: ProfileEntryResponse, trigger: string) => `${trigger}${user.Username} `;

  setInputElementValue = (mention: string): void => {
    this.currentPostModel.text = `${mention}`;
  };

  ngOnInit() {
    this.isReply = !this.isQuote && !!this.parentPost;
    // The fallback route is the route to the pic we use if we can't find an avatar for the user.
    if (this.inTutorial) {
      this.currentPostModel.text = "It's Diamond time!";
    }

    if (this.isReply) {
      this.autoFocusTextArea();
    }

    this.currentPostModel = new PostModel(this.postToEdit);
    this.postModels.push(this.currentPostModel);
  }

  /**
   * Executed when a post text area receives focus. We update the current post
   * model in case the user is editing a previously created post within a
   * multi-post thread context. If this is the first time the the text area has
   * recieved focus we also set up the @mention dropdown menu.
   */
  updateCurrentPostModel(postModel: PostModel) {
    this.currentPostModel = postModel;

    if (!this.currentPostModel.isMentionified && this.textAreas && this.menus) {
      // initialize the @mention menu on the post text area
      new Mentionify<ProfileEntryResponse>(
        this.textAreas.last.nativeElement,
        this.menus.last.nativeElement,
        this.resolveFn,
        this.replaceFn,
        this.menuItemFn,
        this.setInputElementValue
      );

      this.currentPostModel.isMentionified = true;
    }
  }

  onPaste(event: any): void {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    let blob = null;

    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        blob = item.getAsFile();
      }
    }

    if (blob) {
      this._handleFileInput(blob);
    }
  }

  handleFileDrop(event: any, postModel: PostModel): void {
    this.currentPostModel = postModel;
    this._handleFileInput(event[0]);
  }

  setEmbedURL() {
    EmbedUrlParserService.getEmbedURL(this.backendApi, this.globalVars, this.currentPostModel.embedURL).subscribe(
      (res) => {
        this.currentPostModel.constructedEmbedURL = res;
      }
    );
  }

  submitPost(parentPost: PostEntryResponse | undefined = undefined, currentPostModelIndex = 0) {
    if (this.submittingPost) {
      return;
    }

    const post = this.postModels[currentPostModelIndex];

    // post can't be blank
    if (post.text.trim().length === 0 && !post.postImageSrc && !post.postVideoSrc) {
      return;
    }

    const postExtraData: PostExtraData = {};
    if (post.embedURL) {
      if (EmbedUrlParserService.isValidEmbedURL(post.constructedEmbedURL)) {
        postExtraData.EmbedVideoURL = post.constructedEmbedURL;
      }
    }

    if (post.postVideoSrc) {
      postExtraData.LivepeerAssetId = post.assetId;
    }

    if (environment.node.id) {
      postExtraData.Node = environment.node.id.toString();
    }

    if (this.translocoService.getActiveLang()) {
      postExtraData.Language = this.translocoService.getActiveLang();
    }

    if (post.showPoll) {
      postExtraData.PollOptions = JSON.stringify(this.pollOptions.value.filter((e) => e && e.trim()));
      postExtraData.PollExpirationBlockHeight = ""; // leaving it empty for now since it's unused
      postExtraData.PollWeightType = this.currentPostModel.pollType;

      if (this.currentPostModel.pollType === PollWeightType.desoTokenBalance) {
        if (!this.currentPostModel.pollWeightTokenProfile) {
          this.globalVars._alertError("A DeSo Token Profile must be selected to create this poll type.");
          return;
        }

        postExtraData.PollWeightTokenPublicKey = this.currentPostModel.pollWeightTokenProfile.PublicKeyBase58Check;
      }
    }

    const bodyObj = {
      Body: post.text,
      ImageURLs: post.postImageSrc ? [post.postImageSrc] : [],
      VideoURLs: post.postVideoSrc ? [post.postVideoSrc] : [],
    };

    const repostedPostHashHex = this.isQuote && this.parentPost ? this.parentPost.PostHashHex : "";
    this.submittingPost = true;
    const postType = this.isQuote ? "quote" : this.isReply ? "reply" : "post";

    if (this.postModels.length > 1 && !this.postSubmitPercentage) {
      this.postSubmitPercentage = "0";
    }
    const action = this.postToEdit ? "edit" : "create";
    this.backendApi
      .SubmitPost(
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        post.editPostHashHex /*PostHashHexToModify*/,
        this.isReply ? this.parentPost?.PostHashHex ?? "" : parentPost?.PostHashHex ?? "" /*ParentPostHashHex*/,
        bodyObj /*BodyObj*/,
        repostedPostHashHex,
        postExtraData,
        false /*IsHidden*/
      )
      .toPromise()
      .then((response) => {
        this.tracking.log(`post : ${action}`, {
          type: postType,
          hasText: bodyObj.Body.length > 0,
          hasImage: bodyObj.ImageURLs.length > 0,
          hasVideo: bodyObj.VideoURLs.length > 0,
          hasEmbed: !!postExtraData.EmbedVideoURL,
        });

        this.submittingPost = false;

        if (!this.submittedPost) {
          this.submittedPost = response.PostEntryResponse;
        }

        if (parentPost) {
          parentPost.CommentCount++;
          parentPost.Comments = [response.PostEntryResponse];
        }

        if (this.postModels.length > currentPostModelIndex + 1) {
          // Recursively submit until we have submitted all posts. This is only
          // relevant for multi-post threads
          this.postSubmitPercentage = (((currentPostModelIndex + 1) / this.postModels.length) * 100).toFixed();
          return this.submitPost(response.PostEntryResponse, currentPostModelIndex + 1);
        }

        this.postSubmitPercentage = null;
        this.currentPostModel = new PostModel();
        this.postModels = [this.currentPostModel];

        this.changeRef.detectChanges();

        // Refresh the post page.
        if (this.postRefreshFunc && !this.inTutorial) {
          this.postRefreshFunc(this.submittedPost);
        }

        if (this.inTutorial) {
          this.globalVars.updateEverything().add(() => {
            this.postCreated.emit(this.submittedPost!);
          });
        } else {
          this.postCreated.emit(this.submittedPost!);
        }

        this.submittedPost = null;
      })
      .catch((err) => {
        const parsedError = this.backendApi.parsePostError(err);
        this.globalVars._alertError(parsedError);
        this.tracking.log(`post : ${action}`, {
          error: parsedError,
        });
        this.submittingPost = false;

        this.changeRef.detectChanges();
      });
  }

  updatePost(postModel: PostModel) {
    this.postUpdated.emit(postModel.text !== "");
  }

  _createPost() {
    // Check if the user has an account.
    if (!this.globalVars?.loggedInUser) {
      this.modalRef?.hide();
      this.tracking.log("alert : post : account");
      this.modalService.show(WelcomeModalComponent, { initialState: { triggerAction: "post" } });
      return;
    }

    // Check if the user has a profile.
    if (!this.globalVars?.doesLoggedInUserHaveProfile()) {
      this.modalRef?.hide();
      this.tracking.log("alert : post : profile");
      SharedDialogs.showCreateProfileToPostDialog(this.router);
      return;
    }

    // The user has an account and a profile. Let's create a post.
    this.submitPost();
  }

  _handleFilesInput(files: FileList): void {
    this.currentPostModel.showImageLink = false;
    const fileToUpload = files.item(0);
    if (fileToUpload) {
      this._handleFileInput(fileToUpload);
    }
  }

  _handleFileInput(file: File): void {
    if (!file) {
      return;
    }

    this.currentPostModel.isUploadingMedia = true;
    let uploadPromise;

    if (!file.type || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
      this.globalVars._alertError("File selected does not have an image or video file type.");
    } else if (file.type.startsWith("video/")) {
      uploadPromise = this.uploadVideo(file);
    } else if (file.type.startsWith("image/")) {
      uploadPromise = this.uploadImage(file);
    }

    if (uploadPromise) {
      uploadPromise.finally(() => {
        this.currentPostModel.isUploadingMedia = false;
        this.currentPostModel.isProcessingMedia = false;
      });
    }
  }

  uploadImage(file: File) {
    if (file.size > 15 * (1024 * 1024)) {
      this.globalVars._alertError("File is too large. Please choose a file less than 15MB");
      return;
    }
    return this.backendApi
      .UploadImage(this.globalVars.loggedInUser?.PublicKeyBase58Check, file)
      .toPromise()
      .then((res) => {
        this.currentPostModel.postImageSrc = res.ImageURL;
        this.currentPostModel.postVideoSrc = "";
      })
      .catch((err) => {
        this.globalVars._alertError(JSON.stringify(err.error.error));
      });
  }

  async uploadVideo(file: File): Promise<any> {
    if (file.size > 65 * 1024 * 1024) {
      this.globalVars._alertError("File is too large. Please choose a file less than 65MB");
      return;
    }
    this.currentPostModel.isUploadingMedia = true;
    // Set this so that the video upload progress bar shows up.
    this.currentPostModel.postVideoSrc = `https://lvpr.tv`;

    try {
      const { asset } = await uploadVideo({
        file,
        UserPublicKeyBase58Check: this.globalVars.loggedInUser.PublicKeyBase58Check,
      });

      this.currentPostModel.isUploadingMedia = false;
      this.currentPostModel.isProcessingMedia = true;
      this.currentPostModel.postVideoSrc = `https://lvpr.tv/?v=${asset.playbackId}`;
      this.currentPostModel.assetId = asset.id;
      this.currentPostModel.postImageSrc = "";
      this.videoUploadPercentage = null;

      return pollForVideoReady(asset.id);
    } catch (e) {
      this.currentPostModel.postVideoSrc = "";
      this.globalVars._alertError(JSON.stringify(e.error.error));
      return;
    }
  }

  hasAddCommentButton(): boolean {
    if (this.currentPostModel.isUploadingMedia || this.isReply || this.isQuote) {
      return false;
    }

    return !!(
      this.currentPostModel.text ||
      this.currentPostModel.postImageSrc ||
      this.currentPostModel.postVideoSrc ||
      this.currentPostModel.constructedEmbedURL
    );
  }

  addComment() {
    this.postModels.push(new PostModel());
    this.autoFocusTextArea();
  }

  removePostModelAtIndex(index: number) {
    const removedItem = this.postModels[index];
    let indexToFocus: number;

    if (this.currentPostModel === removedItem) {
      this.currentPostModel = this.postModels[index - 1];
      indexToFocus = index - 1;
      this.textAreas?.get(index - 1)?.nativeElement.focus();
    } else {
      indexToFocus = this.postModels.findIndex((model) => model === this.currentPostModel);
    }

    if (indexToFocus > -1) {
      this.textAreas?.get(indexToFocus)?.nativeElement.focus();
    }

    this.postModels.splice(index, 1);
  }

  onNavigateToCreateBlog(ev: Event) {
    this.onCreateBlog?.();
    if (!this.globalVars.loggedInUser) {
      ev.preventDefault();
      this.modalService.show(WelcomeModalComponent, {
        initialState: { triggerAction: "feed-create-post-blog-post-button" },
      });
    } else {
      this.router.navigate(["/" + this.globalVars.RouteNames.CREATE_LONG_POST]);
    }
  }

  private uniqPollOptionValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value.trim() === "") {
        return null;
      }

      const duplicates = this.pollOptions.controls
        .map((e) => e.value)
        .filter((e) => e.toLowerCase().trim() === control.value.toLowerCase().trim());

      return duplicates.length < 2 ? null : { uniq: "Options must be unique" };
    };
  }

  private getNewPollOptionFormItem(required: boolean = false) {
    const validators = [Validators.maxLength(this.MAX_POLL_CHARACTERS), this.uniqPollOptionValidator()];
    if (required) {
      validators.push(Validators.required);
    }
    return new UntypedFormControl("", validators);
  }

  togglePoll() {
    const newState = !this.currentPostModel.showPoll;
    this.currentPostModel.showPoll = newState;

    if (newState) {
      this.pollOptions.push(this.getNewPollOptionFormItem(true));
      this.pollOptions.push(this.getNewPollOptionFormItem(true));
      this.changeRef.detectChanges();
      this.autoFocusTextArea();
    } else {
      this.pollOptions.clear();
    }

    this.changeRef.detectChanges();
  }

  addPollOption() {
    this.pollOptions.push(this.getNewPollOptionFormItem());
    this.changeRef.detectChanges();
    this.pollOptionsRef.last.nativeElement.focus();
  }

  removePollOption(index: number) {
    this.pollOptions.removeAt(index);
    this.changeRef.detectChanges();
  }

  keepPollWeightsOrder() {
    // keeps original order when iterating thought *ngFor with `keyvalue` pipe
    return 0;
  }

  onPollTokenProfileSelected(profile: ProfileEntryResponse) {
    this.currentPostModel.pollWeightTokenProfile = profile;
  }

  private autoFocusTextArea() {
    setTimeout(() => {
      this.textAreas?.last.nativeElement.focus();
    }, 50);
  }
}
