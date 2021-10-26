import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Input,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef, AfterViewInit
} from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService, BackendRoutes, PostEntryResponse, ProfileEntryResponse } from "../../backend-api.service";
import { Router, ActivatedRoute } from "@angular/router";
import { SharedDialogs } from "../../../lib/shared-dialogs";
import { CdkTextareaAutosize } from "@angular/cdk/text-field";
import { EmbedUrlParserService } from "../../../lib/services/embed-url-parser-service/embed-url-parser-service";
import { environment } from "../../../environments/environment";
import * as tus from "tus-js-client";
import Timer = NodeJS.Timer;
import { CloudflareStreamService } from "../../../lib/services/stream/cloudflare-stream-service";
import * as _ from "lodash";

@Component({
  selector: "feed-create-post",
  templateUrl: "./feed-create-post.component.html",
  styleUrls: ["./feed-create-post.component.sass"],
})
export class FeedCreatePostComponent implements OnInit, AfterViewInit {
  static SHOW_POST_LENGTH_WARNING_THRESHOLD = 515; // show warning at 515 characters

  EmbedUrlParserService = EmbedUrlParserService;

  @Input() postRefreshFunc: any = null;
  @Input() numberOfRowsInTextArea: number = 2;
  @Input() parentPost: PostEntryResponse = null;
  @Input() isQuote: boolean = false;
  @Input() inTutorial: boolean = false;

  isComment: boolean;

  @ViewChild("autosize") autosize: CdkTextareaAutosize;
  @ViewChild("textarea") textAreaEl: ElementRef;
  @ViewChild("menu") menuEl: ElementRef;

  randomMovieQuote = "";
  randomMovieQuotes = [
    "Go ahead, make my day.",
    "The stuff that dreams are made of.",
    "Made it, Ma! Top of the world!",
    "I'll be back.",
    "Open the pod bay doors, HAL.",
    "Who's on first.",
    "What's on second.",
    "I feel the need - the need for speed!",
    "I'm king of the world!",
    "If you build it, they will come.",
    "Roads? Where we're going we don't need roads",
    "To infinity and beyond!",
    "May the Force be with you",
    "I've got a feeling we're not in Kansas anymore",
    "E.T. phone home",
    "Elementary, my dear Watson",
    "I'm going to make him an offer he can't refuse.",
    "Big things have small beginnings.",
  ];

  submittingPost = false;
  postInput = "";
  postImageSrc = null;

  postVideoSrc = null;
  videoUploadPercentage = null;

  showEmbedURL = false;
  showImageLink = false;
  embedURL = "";
  constructedEmbedURL: any;
  videoStreamInterval: Timer = null;
  readyToStream: boolean = false;

  // Emits a PostEntryResponse. It would be better if this were typed.
  @Output() postCreated = new EventEmitter();

  globalVars: GlobalVarsService;
  GlobalVarsService = GlobalVarsService;

  users = [{ username: "john_doe" }, { username: "jane_doe" }];
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private changeRef: ChangeDetectorRef,
    private appData: GlobalVarsService,
    private streamService: CloudflareStreamService
  ) {
    this.globalVars = appData;
  }

  resolveFn = (prefix) => this.getUsersFromPrefix(prefix);

  async getUsersFromPrefix(prefix) {
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
    return profiles.ProfilesFound;
  }

  // Create and format the item in the dropdown
  menuItemFn = (user, setItem, selected) => {
    const div = document.createElement("div");
    div.setAttribute("role", "option");
    div.className = "menu-item";
    if (selected) {
      div.classList.add("selected");
      div.setAttribute("aria-selected", "");
    }
    // The fallback route is the route to the pic we use if we can't find an avatar for the user.
    let fallbackRoute = `fallback=${this.backendApi.GetDefaultProfilePictureURL(window.location.host)}`;

    // Although it would be hard for an attacker to inject a malformed public key into the app,
    // we do a basic _.escape anyways just to be extra safe.
    const profPicURL = _.escape(
      this.backendApi.GetSingleProfilePictureURL(this.globalVars.localNode, user.PublicKeyBase58Check, fallbackRoute)
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

  ngOnInit() {
    this.isComment = !this.isQuote && !!this.parentPost;
    this._setRandomMovieQuote();
    if (this.inTutorial) {
      this.postInput = "It's Diamond time!";
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      new Mentionify(
        this.textAreaEl.nativeElement,
        this.menuEl.nativeElement,
        this.resolveFn,
        replaceFn,
        this.menuItemFn
      );
    }, 50);
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

  uploadFile(event: any): void {
    if (!this.isComment) {
      this._handleFileInput(event[0]);
    }
  }

  showCharacterCountIsFine() {
    return this.postInput.length < FeedCreatePostComponent.SHOW_POST_LENGTH_WARNING_THRESHOLD;
  }

  showCharacterCountWarning() {
    return (
      this.postInput.length >= FeedCreatePostComponent.SHOW_POST_LENGTH_WARNING_THRESHOLD &&
      this.postInput.length <= GlobalVarsService.MAX_POST_LENGTH
    );
  }

  characterCountExceedsMaxLength() {
    return this.postInput.length > GlobalVarsService.MAX_POST_LENGTH;
  }

  getPlaceholderText() {
    // Creating vanilla post
    if (!this.parentPost) {
      return this.randomMovieQuote;
    }
    // Creating comment or quote repost;
    return this.isQuote ? "Add a quote" : "Post your reply";
  }

  _setRandomMovieQuote() {
    const randomInt = Math.floor(Math.random() * this.randomMovieQuotes.length);
    this.randomMovieQuote = this.randomMovieQuotes[randomInt];
  }

  setEmbedURL() {
    EmbedUrlParserService.getEmbedURL(this.backendApi, this.globalVars, this.embedURL).subscribe(
      (res) => (this.constructedEmbedURL = res)
    );
  }

  submitPost() {
    if (this.postInput.length > GlobalVarsService.MAX_POST_LENGTH) {
      return;
    }

    // post can't be blank
    if (this.postInput.length === 0 && !this.postImageSrc && !this.postVideoSrc) {
      return;
    }

    if (this.submittingPost) {
      return;
    }

    const postExtraData = {};
    if (this.embedURL) {
      if (EmbedUrlParserService.isValidEmbedURL(this.constructedEmbedURL)) {
        postExtraData["EmbedVideoURL"] = this.constructedEmbedURL;
      }
    }

    const bodyObj = {
      Body: this.postInput,
      // Only submit images if the post is a quoted repost or a vanilla post.
      ImageURLs: !this.isComment ? [this.postImageSrc].filter((n) => n) : [],
      VideoURLs: !this.isComment ? [this.postVideoSrc].filter((n) => n) : [],
    };
    const repostedPostHashHex = this.isQuote ? this.parentPost.PostHashHex : "";
    this.submittingPost = true;
    const postType = this.isQuote ? "quote" : this.isComment ? "reply" : "create";

    this.backendApi
      .SubmitPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        "" /*PostHashHexToModify*/,
        this.isComment ? this.parentPost.PostHashHex : "" /*ParentPostHashHex*/,
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
      .subscribe(
        (response) => {
          this.globalVars.logEvent(`post : ${postType}`);

          this.submittingPost = false;

          this.postInput = "";
          this.postImageSrc = null;
          this.postVideoSrc = null;
          this.embedURL = "";
          this.constructedEmbedURL = "";
          this.changeRef.detectChanges();

          // Refresh the post page.
          if (this.postRefreshFunc) {
            this.postRefreshFunc(response.PostEntryResponse);
          }

          this.postCreated.emit(response.PostEntryResponse);
        },
        (err) => {
          const parsedError = this.backendApi.parsePostError(err);
          this.globalVars._alertError(parsedError);
          this.globalVars.logEvent(`post : ${postType} : error`, { parsedError });

          this.submittingPost = false;
          this.changeRef.detectChanges();
        }
      );
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
    this.showImageLink = false;
    const fileToUpload = files.item(0);
    this._handleFileInput(fileToUpload);
  }

  _handleFileInput(file: File): void {
    if (!file) {
      return;
    }

    if (!file.type || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
      this.globalVars._alertError("File selected does not have an image or video file type.");
    } else if (file.type.startsWith("video/")) {
      this.uploadVideo(file);
    } else if (file.type.startsWith("image/")) {
      this.uploadImage(file);
    }
  }

  uploadImage(file: File) {
    if (file.size > 15 * (1024 * 1024)) {
      this.globalVars._alertError("File is too large. Please choose a file less than 15MB");
      return;
    }
    return this.backendApi
      .UploadImage(environment.uploadImageHostname, this.globalVars.loggedInUser.PublicKeyBase58Check, file)
      .subscribe(
        (res) => {
          this.postImageSrc = res.ImageURL;
          this.postVideoSrc = null;
        },
        (err) => {
          this.globalVars._alertError(JSON.stringify(err.error.error));
        }
      );
  }

  uploadVideo(file: File): void {
    if (file.size > 4 * (1024 * 1024 * 1024)) {
      this.globalVars._alertError("File is too large. Please choose a file less than 4GB");
      return;
    }
    let upload: tus.Upload;
    let mediaId = "";
    const comp: FeedCreatePostComponent = this;
    const options = {
      endpoint: this.backendApi._makeRequestURL(environment.uploadVideoHostname, BackendRoutes.RoutePathUploadVideo),
      chunkSize: 50 * 1024 * 1024, // Required a minimum chunk size of 5MB, here we use 50MB.
      uploadSize: file.size,
      onError: function (error) {
        comp.globalVars._alertError(error.message);
        upload.abort(true).then(() => {
          throw error;
        });
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        comp.videoUploadPercentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
      },
      onSuccess: function () {
        // Construct the url for the video based on the videoId and use the iframe url.
        comp.postVideoSrc = `https://iframe.videodelivery.net/${mediaId}`;
        comp.postImageSrc = null;
        comp.videoUploadPercentage = null;
        comp.pollForReadyToStream();
      },
      onAfterResponse: function (req, res) {
        return new Promise((resolve) => {
          // The stream-media-id header is the video Id in Cloudflare's system that we'll need to locate the video for streaming.
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
    // Reset the postVideoSrc and readyToStream values.
    this.postVideoSrc = null;
    this.readyToStream = false;
    // Create and start the upload.
    upload = new tus.Upload(file, options);
    upload.start();
    return;
  }

  pollForReadyToStream(): void {
    let attempts = 0;
    let numTries = 1200;
    let timeoutMillis = 500;
    this.videoStreamInterval = setInterval(() => {
      if (attempts >= numTries) {
        clearInterval(this.videoStreamInterval);
        return;
      }
      this.streamService
        .checkVideoStatusByURL(this.postVideoSrc)
        .subscribe(([readyToStream, exitPolling]) => {
          if (readyToStream) {
            this.readyToStream = true;
            clearInterval(this.videoStreamInterval);
            return;
          }
          if (exitPolling) {
            clearInterval(this.videoStreamInterval);
            return;
          }
        })
        .add(() => attempts++);
    }, timeoutMillis);
  }
}

const properties = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",

  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",

  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",

  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",

  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",

  "letterSpacing",
  "wordSpacing",

  "tabSize",
  "MozTabSize",
];

const isFirefox = typeof window !== "undefined" && window["mozInnerScreenX"] != null;

/**
 * @param {HTMLTextAreaElement} element
 * @param {number} position
 */
function getCaretCoordinates(element, position) {
  const div = document.createElement("div");
  document.body.appendChild(div);

  const style = div.style;
  const computed = getComputedStyle(element);

  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  style.position = "absolute";
  style.visibility = "hidden";

  properties.forEach((prop) => {
    style[prop] = computed[prop];
  });

  if (isFirefox) {
    if (element.scrollHeight > parseInt(computed.height)) style.overflowY = "scroll";
  } else {
    style.overflow = "hidden";
  }

  div.textContent = element.value.substring(0, position);

  const span = document.createElement("span");
  span.textContent = element.value.substring(position) || ".";
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed["borderTopWidth"]),
    left: span.offsetLeft + parseInt(computed["borderLeftWidth"]),
    // height: parseInt(computed['lineHeight'])
    height: span.offsetHeight,
  };

  div.remove();

  return coordinates;
}

class Mentionify {
  private ref: any;
  private menuRef: any;
  private resolveFn: any;
  private replaceFn: any;
  private menuItemFn: any;
  private options: any;
  private left: any;
  private top: any;
  private triggerIdx: any;
  private active: number;
  private currentToken: string;

  constructor(ref, menuRef, resolveFn, replaceFn, menuItemFn) {
    this.ref = ref;
    this.menuRef = menuRef;
    this.resolveFn = resolveFn;
    this.replaceFn = replaceFn;
    this.menuItemFn = menuItemFn;
    this.options = [];
    this.currentToken = "";

    this.makeOptions = this.makeOptions.bind(this);
    this.closeMenu = this.closeMenu.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this.onInput = this.onInput.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.renderMenu = this.renderMenu.bind(this);

    this.ref.addEventListener("input", this.onInput);
    this.ref.addEventListener("keydown", this.onKeyDown);
  }

  async makeOptions(query) {
    const options = await this.resolveFn(query);
    if (options.lenght !== 0) {
      this.options = options;
      // Only render the menu if the resolved query and the current token are substrings of each other
      if (this.isStringSubstring(this.currentToken, query)) {
        this.renderMenu();
      }
    } else {
      this.closeMenu();
    }
  }

  // Returns true if one of the inputted strings is a substring of the other
  isStringSubstring(str1: string, str2: string) {
    if (str1.length >= str2.length) {
      return str1.substr(0, str2.length) === str2;
    } else {
      return str2.substr(0, str1.length) === str1;
    }
  }

  closeMenu() {
    setTimeout(() => {
      this.options = [];
      this.left = undefined;
      this.top = undefined;
      this.triggerIdx = undefined;
      this.renderMenu();
    }, 0);
  }

  selectItem(active) {
    return () => {
      const preMention = this.ref.value.substr(0, this.triggerIdx);
      const option = this.options[active];
      const mention = this.replaceFn(option, this.ref.value[this.triggerIdx]);
      const postMention = this.ref.value.substr(this.ref.selectionStart);
      const newValue = `${preMention}${mention}${postMention}`;
      this.ref.value = newValue;
      const caretPosition = this.ref.value.length - postMention.length;
      this.ref.setSelectionRange(caretPosition, caretPosition);
      this.closeMenu();
      this.ref.focus();
    };
  }

  onInput(ev) {
    const positionIndex = this.ref.selectionStart;
    const textBeforeCaret = this.ref.value.slice(0, positionIndex);
    const tokens = textBeforeCaret.split(/\s/);
    const lastToken = tokens[tokens.length - 1];
    const triggerIdx = textBeforeCaret.endsWith(lastToken) ? textBeforeCaret.length - lastToken.length : -1;
    const maybeTrigger = textBeforeCaret[triggerIdx];
    const keystrokeTriggered = maybeTrigger === "@" && lastToken.length >= 2;

    if (!keystrokeTriggered) {
      this.closeMenu();
      return;
    }

    const query = textBeforeCaret.slice(triggerIdx + 1);
    this.currentToken = query;
    this.makeOptions(query);

    const coords = getCaretCoordinates(this.ref, positionIndex);
    const { top, left } = this.ref.getBoundingClientRect();
    let modalTop = 0;
    let modalLeft = 0;
    const modal = document.querySelector(".modal-content");
    if (modal) {
      const modalBoundingClientRect = modal.getBoundingClientRect();
      modalLeft = modalBoundingClientRect.left;
      modalTop = modalBoundingClientRect.top;
    }

    setTimeout(() => {
      this.active = 0;
      this.left = window.scrollX + coords.left + left + this.ref.scrollLeft - modalLeft;
      this.top = window.scrollY + coords.top + top + coords.height - this.ref.scrollTop - modalTop;
      this.triggerIdx = triggerIdx;
      this.renderMenu();
    }, 0);
  }

  onKeyDown(ev) {
    let keyCaught = false;
    if (this.triggerIdx !== undefined) {
      switch (ev.key) {
        case "ArrowDown":
          this.active = Math.min(this.active + 1, this.options.length - 1);
          this.renderMenu();
          keyCaught = true;
          break;
        case "ArrowUp":
          this.active = Math.max(this.active - 1, 0);
          this.renderMenu();
          keyCaught = true;
          break;
        case "Enter":
        case "Tab":
          this.selectItem(this.active)();
          keyCaught = true;
          break;
      }
    }

    if (keyCaught) {
      ev.preventDefault();
    }
  }

  renderMenu() {
    if (this.top === undefined) {
      this.menuRef.hidden = true;
      return;
    }

    this.menuRef.style.left = this.left + "px";
    this.menuRef.style.top = this.top + "px";
    this.menuRef.innerHTML = "";

    this.options.forEach((option, idx) => {
      this.menuRef.appendChild(this.menuItemFn(option, this.selectItem(idx), this.active === idx));
    });

    this.menuRef.hidden = false;
  }
}

const replaceFn = (user, trigger) => `${trigger}${user.Username} `;
