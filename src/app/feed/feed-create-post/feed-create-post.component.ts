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
import * as _ from "lodash";
import * as tus from "tus-js-client";
import { environment } from "../../../environments/environment";
import { EmbedUrlParserService } from "../../../lib/services/embed-url-parser-service/embed-url-parser-service";
import { Mentionify } from "../../../lib/services/mention-autofill/mentionify";
import { CloudflareStreamService } from "../../../lib/services/stream/cloudflare-stream-service";
import { SharedDialogs } from "../../../lib/shared-dialogs";
import { BackendApiService, BackendRoutes, PostEntryResponse, ProfileEntryResponse } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";
import Timer = NodeJS.Timer;

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
  embedURL = "";
  constructedEmbedURL = "";
  showEmbedURL = false;
  showImageLink = false;
  isMentionified = false;
  placeHolderText: string;
  isUploadingMedia = false;

  private quotes = RANDOM_MOVIE_QUOTES.slice();

  constructor() {
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

interface PostExtraData {
  EmbedVideoURL?: string;
  Node?: string;
  Language?: string;
}

// show warning at 515 characters
const SHOW_POST_LENGTH_WARNING_THRESHOLD = 515;

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
  videoStreamInterval: Timer | null = null;
  fallbackProfilePicURL: string | undefined;
  maxPostLength = GlobalVarsService.MAX_POST_LENGTH;
  globalVars: GlobalVarsService;
  submittedPost: PostEntryResponse | null = null;
  embedUrlParserService = EmbedUrlParserService;

  @Input() postRefreshFunc: any = null;
  @Input() numberOfRowsInTextArea: number = 2;
  @Input() parentPost: PostEntryResponse | null = null;
  @Input() isQuote = false;
  @Input() inTutorial = false;
  @Input() inModal = false;
  @Input() onCreateBlog?: () => void;
  @Output() postUpdated = new EventEmitter<boolean>();
  @Output() postCreated = new EventEmitter<PostEntryResponse>();

  @ViewChildren("autosizables") autosizables: QueryList<CdkTextareaAutosize> | undefined;
  @ViewChildren("textareas") textAreas: QueryList<ElementRef<HTMLTextAreaElement>> | undefined;
  @ViewChildren("menus") menus: QueryList<ElementRef<HTMLDivElement>> | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private changeRef: ChangeDetectorRef,
    private appData: GlobalVarsService,
    private streamService: CloudflareStreamService,
    private translocoService: TranslocoService
  ) {
    this.globalVars = appData;
    this.postModels.push(this.currentPostModel);
  }

  // Functions for the mention autofill component
  resolveFn = (prefix: string) => this.getUsersFromPrefix(prefix);

  async getUsersFromPrefix(prefix: string): Promise<ProfileEntryResponse[]> {
    const profiles = await this.backendApi
      .GetProfiles(
        this.globalVars.localNode,
        "" /*PublicKeyBase58Check*/,
        "" /*Username*/,
        prefix.trim().replace(/^@/, "") /*UsernamePrefix*/,
        "" /*Description*/,
        "influencer_coin_price" /*Order by*/,
        5 /*NumToFetch*/,
        this.globalVars.loggedInUser.PublicKeyBase58Check /*ReaderPublicKeyBase58Check*/,
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
    const profPicURL = _.escape(
      this.backendApi.GetSingleProfilePictureURL(
        this.globalVars.localNode,
        user.PublicKeyBase58Check ?? "",
        this.fallbackProfilePicURL
      )
    );
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
    this.fallbackProfilePicURL = `fallback=${this.backendApi.GetDefaultProfilePictureURL(window.location.host)}`;
    if (this.inTutorial) {
      this.currentPostModel.text = "It's Diamond time!";
    }

    if (this.isReply) {
      this.autoFocusTextArea();
    }
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

    if (environment.node.id) {
      postExtraData.Node = environment.node.id.toString();
    }

    if (this.translocoService.getActiveLang()) {
      postExtraData.Language = this.translocoService.getActiveLang();
    }

    const bodyObj = {
      Body: post.text,
      ImageURLs: post.postImageSrc ? [post.postImageSrc] : [],
      VideoURLs: post.postVideoSrc ? [post.postVideoSrc] : [],
    };

    const repostedPostHashHex = this.isQuote && this.parentPost ? this.parentPost.PostHashHex : "";
    this.submittingPost = true;
    const postType = this.isQuote ? "quote" : this.isReply ? "reply" : "create";

    if (this.postModels.length > 1 && !this.postSubmitPercentage) {
      this.postSubmitPercentage = "0";
    }

    this.backendApi
      .SubmitPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        "" /*PostHashHexToModify*/,
        this.isReply ? this.parentPost?.PostHashHex ?? "" : parentPost?.PostHashHex ?? "" /*ParentPostHashHex*/,
        "" /*Title*/,
        bodyObj /*BodyObj*/,
        repostedPostHashHex,
        postExtraData,
        "" /*Sub*/,
        // TODO: Should we have different values for creator basis points and stake multiple?
        // TODO: Also, it may not be reasonable to allow stake multiple to be set in the FE.
        false /*IsHidden*/,
        this.globalVars.defaultFeeRateNanosPerKB /*MinFeeRateNanosPerKB*/,
        this.inTutorial
      )
      .toPromise()
      .then((response) => {
        this.globalVars.logEvent(`post : ${postType}`);

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
        this.globalVars.logEvent(`post : ${postType} : error`, { parsedError });
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
      this.globalVars.logEvent("alert : post : account");
      SharedDialogs.showCreateAccountToPostDialog(this.globalVars);
      return;
    }

    // Check if the user has a profile.
    if (!this.globalVars?.doesLoggedInUserHaveProfile()) {
      this.globalVars.logEvent("alert : post : profile");
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
      });
    }
  }

  uploadImage(file: File) {
    if (file.size > 15 * (1024 * 1024)) {
      this.globalVars._alertError("File is too large. Please choose a file less than 15MB");
      return;
    }
    return this.backendApi
      .UploadImage(environment.uploadImageHostname, this.globalVars.loggedInUser.PublicKeyBase58Check, file)
      .toPromise()
      .then((res) => {
        this.currentPostModel.postImageSrc = res.ImageURL;
        this.currentPostModel.postVideoSrc = "";
      })
      .catch((err) => {
        this.globalVars._alertError(JSON.stringify(err.error.error));
      });
  }

  uploadVideo(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      if (file.size > 4 * (1024 * 1024 * 1024)) {
        this.globalVars._alertError("File is too large. Please choose a file less than 4GB");
        return;
      }
      let upload: tus.Upload;
      let mediaId = "";
      const options: tus.UploadOptions = {
        endpoint: this.backendApi._makeRequestURL(environment.uploadVideoHostname, BackendRoutes.RoutePathUploadVideo),
        chunkSize: 50 * 1024 * 1024, // Required a minimum chunk size of 5MB, here we use 50MB.
        uploadSize: file.size,
        onError: (error: Error) => {
          this.globalVars._alertError(error.message);
          upload
            .abort(true)
            .then(() => {
              throw error;
            })
            .finally(reject);
        },
        onProgress: (bytesUploaded: number, bytesTotal: number) => {
          this.videoUploadPercentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        },
        onSuccess: () => {
          // Construct the url for the video based on the videoId and use the iframe url.
          this.currentPostModel.postVideoSrc = `https://iframe.videodelivery.net/${mediaId}`;
          this.currentPostModel.postImageSrc = "";
          this.videoUploadPercentage = null;
          this.pollForReadyToStream(resolve);
        },
        onAfterResponse: (req: tus.HttpRequest, res: tus.HttpResponse) => {
          // The stream-media-id header is the video Id in Cloudflare's system that we'll need to locate the video for streaming.
          return new Promise((resolve) => {
            let mediaIdHeader = res.getHeader("stream-media-id");
            if (mediaIdHeader) {
              mediaId = mediaIdHeader;
            }

            resolve(res);
          });
        },
      };
      // Clear the interval used for polling cloudflare to check if a video is ready to stream.
      if (this.videoStreamInterval != null) {
        clearInterval(this.videoStreamInterval);
      }
      if (this.currentPostModel) {
        // Reset the postVideoSrc and readyToStream values.
        this.currentPostModel.postVideoSrc = "";
      }
      // Create and start the upload.
      upload = new tus.Upload(file, options);
      upload.start();
    });
  }

  pollForReadyToStream(onReadyToStream: Function): void {
    let attempts = 0;
    let numTries = 1200;
    let timeoutMillis = 500;
    this.videoStreamInterval = setInterval(() => {
      if (attempts >= numTries) {
        clearInterval(this.videoStreamInterval!);
        return;
      }
      this.streamService
        .checkVideoStatusByURL(this.currentPostModel.postVideoSrc)
        .subscribe(([readyToStream, exitPolling]) => {
          if (readyToStream) {
            onReadyToStream();
            clearInterval(this.videoStreamInterval!);
            return;
          }
          if (exitPolling) {
            clearInterval(this.videoStreamInterval!);
            return;
          }
        })
        .add(() => attempts++);
    }, timeoutMillis);
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

  onNavigateToCreateBlog() {
    this.onCreateBlog?.();
  }

  private autoFocusTextArea() {
    setTimeout(() => {
      this.textAreas?.last.nativeElement.focus();
    }, 50);
  }
}
