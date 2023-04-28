// @ts-strict
import { animate, state, style, transition, trigger } from "@angular/animations";
import { Location } from "@angular/common";
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { GetSinglePostResponse, ProfileEntryResponse, waitForTransactionFound } from "deso-protocol";
import { escape, has } from "lodash";
import { BsModalService } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import "quill-mention";
import { BackendApiService } from "src/app/backend-api.service";
import { GlobalVarsService } from "src/app/global-vars.service";
import { WelcomeModalComponent } from "src/app/welcome-modal/welcome-modal.component";
import { dataURLtoFile } from "src/lib/helpers/data-url-helpers";
import { catchError, finalize, mergeMap, tap } from "rxjs/operators";
import { ApiInternalService, DraftBlogPostResponse } from "../../api-internal.service";
import { of } from "rxjs";
import { ManageDraftsModalComponent } from "../manage-drafts-modal/manage-drafts-modal.component";
import { SwalHelper } from "../../../lib/helpers/swal-helper";

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

export interface BlogPostExtraData {
  Title: string;
  Description: string;
  BlogDeltaRtfFormat: string;
  BlogTitleSlug: string;
  CoverImage: string;
}

class FormModel {
  Title = "";
  Description = "";
  ContentDelta: any = null;
  CoverImage = "";
  errors: string[] = [];

  get hasErrors() {
    return this.errors.length > 0;
  }

  validate() {
    if (this.Title.trim() === "") {
      this.errors.push("Headline is a required field!");
    }
    if (!this.ContentDelta?.ops) {
      this.errors.push("Blog content is required field!");
    }
  }

  clearErrors() {
    this.errors = [];
  }
}

interface MentionRenderItem {
  id: string;
  value: string;
}

@Component({
  selector: "create-long-post",
  templateUrl: "./create-long-post.component.html",
  styleUrls: ["./create-long-post.component.scss"],
  animations: [
    trigger("heightAnimation", [
      state(
        "expanded",
        style({
          height: "0",
          transform: "translateY(-560px)",
        })
      ),
      state(
        "collapsed",
        style({
          height: "*",
          transform: "translateY(0)",
        })
      ),
      transition("expanded <=> collapsed", animate("500ms ease-in-out")),
    ]),
  ],
})
export class CreateLongPostComponent implements OnInit, OnDestroy {
  @ViewChild("coverImgInput") coverImgInput?: ElementRef<HTMLInputElement>;
  @ViewChild("titleInput") titleInput?: ElementRef<HTMLInputElement>;

  coverImageFile?: File;
  model = new FormModel();
  isDraggingFileOverDropZone = false;
  isSubmittingPost = false;
  isLoading: boolean;
  isDraftSaving: boolean = false;
  placeholder = RANDOM_MOVIE_QUOTES[Math.floor(Math.random() * RANDOM_MOVIE_QUOTES.length)];
  contentAsPlainText?: string;
  editorState: "collapsed" | "expanded" = "collapsed";
  editedDraftBlogPostId: string = "";
  defaultDraftBlogPost: DraftBlogPostResponse | null = null;
  lastAutoSavedAt: string = "";
  isAutoSaving: boolean = false;
  private profilesByPublicKey: Record<string, ProfileEntryResponse> = {};
  private autoSaveDraftBlogPostInterval: number = -1;

  readonly AUTO_SAVE_DRAFT_TIME = 5000;

  quillModules = {
    toolbar: [
      ["bold", "italic", "underline", "strike"], // toggled buttons
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "super" }],
      [{ header: [1, 2, 3, false] }],
      ["link", "image"],
    ],
    mention: {
      allowedChars: /^[\w]*$/,
      mentionDenotationChars: ["@", "$"],
      source: async (searchTerm: string, renderList: (values: any, searchTerm: string) => void) => {
        if (searchTerm.length === 0) return;
        const profiles = await this.getUsersFromMentionPrefix(searchTerm);
        const renderItems: MentionRenderItem[] = [];
        profiles.forEach((p) => {
          this.profilesByPublicKey[p.PublicKeyBase58Check!] = p;
          renderItems.push({ id: p.PublicKeyBase58Check!, value: p.Username });
        });
        renderList(renderItems, searchTerm);
      },
      renderItem: (item: MentionRenderItem) => {
        const profile = this.profilesByPublicKey[item.id];
        const profPicURL = this.backendApi.GetSingleProfilePictureURL(profile.PublicKeyBase58Check);
        return `<div class="menu-item">
          <div class="d-flex align-items-center">
            <img src="${escape(profPicURL)}" height="30px" width="30px" style="border-radius: 10px" class="mr-5px">
            <p>${escape(profile.Username)}</p>
            ${profile.IsVerified ? `<i class="fas fa-check-circle fa-md ml-5px fc-blue"></i>` : ""}
          </div>
        </div>`;
      },
    },
  };

  get coverImgSrc() {
    return this.model.CoverImage;
  }

  get editPostHashHex() {
    return this.route.snapshot.params?.postHashHex ?? "";
  }

  constructor(
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private toastr: ToastrService,
    public location: Location,
    private modalService: BsModalService,
    private apiInternalService: ApiInternalService
  ) {
    this.isLoading = !!this.route.snapshot.params?.postHashHex;
  }

  ngOnDestroy() {
    window.clearInterval(this.autoSaveDraftBlogPostInterval);
  }

  autoSaveDraftBlogPost() {
    this.autoSaveDraftBlogPostInterval = window.setInterval(() => {
      if (this.isSubmittingPost || this.isDraftSaving) {
        return;
      }

      this.isAutoSaving = true;

      const isDefault = this.editedDraftBlogPostId === this.defaultDraftBlogPost?.Id;

      this.saveDraftBlogPost(isDefault)
        .pipe(
          finalize(() => {
            setTimeout(() => {
              this.isAutoSaving = false;
            }, 500);
          })
        )
        .subscribe((res) => {
          if (res?.LastUpdatedAt) {
            this.lastAutoSavedAt = this.formatDraftDate(res.LastUpdatedAt, true);
          }
        });
    }, this.AUTO_SAVE_DRAFT_TIME);
  }

  newDraftBlogPost() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: `Create New Blog Post`,
      html: `You have un-stashed changes in your working draft "${
        this.defaultDraftBlogPost?.PostTitle || "Untitled"
      }" - would you like to save these changes before starting a new blog? This draft will be discarded otherwise.`,
      showCancelButton: true,
      showConfirmButton: true,
      focusConfirm: true,
      customClass: {
        popup: "new-draft-blog-modal-container",
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      confirmButtonText: "Save & Create New",
      cancelButtonText: "Discard & Create New",
      reverseButtons: true,
    }).then((res: any) => {
      if (res.dismiss === "backdrop") {
        // When user just clicked outside the modal dialog we do nothing
        return;
      }

      this.isDraftSaving = true;

      if (res.isConfirmed) {
        if (!this.defaultDraftBlogPost) {
          return;
        }

        // Save the current draft to a named draft post
        this.editedDraftBlogPostId = "";

        this.saveDraftBlogPost(false, {
          Title: this.defaultDraftBlogPost.PostTitle,
          Description: this.defaultDraftBlogPost.PostDescription,
          CoverImage: this.defaultDraftBlogPost.CoverPhotoUrl,
          ContentDelta: this.defaultDraftBlogPost.PostDelta,
        } as FormModel)
          .pipe(
            finalize(() => {
              this.isDraftSaving = false;
            }),
            mergeMap(() => {
              this.editedDraftBlogPostId = this.defaultDraftBlogPost?.Id || "";

              // Reset the default draft
              return this.saveDraftBlogPost(true, {
                Title: "",
                Description: "",
                ContentDelta: {},
                CoverImage: "",
              } as FormModel);
            })
          )
          .subscribe((res) => {
            this.setSavedDraftBlogPost(res);
          });
      } else {
        this.editedDraftBlogPostId = this.defaultDraftBlogPost?.Id || "";

        return this.saveDraftBlogPost(true, {
          Title: "",
          Description: "",
          ContentDelta: {},
          CoverImage: "",
        } as FormModel)
          .pipe(
            finalize(() => {
              this.isDraftSaving = false;
            })
          )
          .subscribe((res) => {
            this.setSavedDraftBlogPost(res);
          });
      }
    });
  }

  saveDraftBlogPost(IsDefault: boolean = true, postData: FormModel = this.model) {
    return this.apiInternalService
      .saveDraftBlogPost(this.globalVars.loggedInUser.PublicKeyBase58Check, {
        Id: this.editedDraftBlogPostId || undefined,
        IsDefault,
        UserPublicKeyBase58check: this.globalVars.loggedInUser.PublicKeyBase58Check,
        PostTitle: postData.Title,
        PostDescription: postData.Description,
        PostDelta: JSON.stringify(postData.ContentDelta),
        CoverPhotoUrl: postData.CoverImage,
      })
      .pipe(
        tap((res) => {
          if (IsDefault) {
            this.defaultDraftBlogPost = res;
          }
        }),
        catchError((e: any) => {
          console.error(e);
          this.globalVars._alertError(e);
          return of(null);
        })
      );
  }

  manageDrafts() {
    this.modalService.show(ManageDraftsModalComponent, {
      initialState: {
        onViewDraft: (draft: DraftBlogPostResponse) => {
          window.clearInterval(this.autoSaveDraftBlogPostInterval);
          this.setSavedDraftBlogPost(draft);
          this.autoSaveDraftBlogPost();
        },
        formatDate: this.formatDraftDate,
        activeDraftId: this.editedDraftBlogPostId,
      },
      class: "modal-dialog-centered",
    });
  }

  async ngOnInit() {
    this.titleService.setTitle(`Publish Blog Post`);

    if (this.editPostHashHex) {
      try {
        const editPost = await this.getBlogPostToEdit(this.editPostHashHex);
        if (editPost.PostFound?.PostExtraData?.BlogDeltaRtfFormat) {
          const editPostData = editPost.PostFound?.PostExtraData;
          const contentDelta = JSON.parse(editPostData.BlogDeltaRtfFormat);
          Object.assign(this.model, { ...editPostData, ContentDelta: contentDelta });
          this.contentAsPlainText = contentDelta.ops.reduce(
            (text: string, op: any) => `${text}${typeof op.insert === "string" ? op.insert : ""}`,
            ""
          );
        }
      } catch (e) {
        console.error(e);
        // This is assuming 404 which might hide other types of errors, but this is currently what the
        // post thread page does...
        this.router.navigateByUrl("/" + this.globalVars.RouteNames.NOT_FOUND, { skipLocationChange: true });
      } finally {
        this.isLoading = false;
        this.titleInput?.nativeElement?.focus();
      }
    } else {
      this.getDefaultDraftBlogPost();
    }
  }

  async getUsersFromMentionPrefix(prefix: string): Promise<ProfileEntryResponse[]> {
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

  async getDefaultDraftBlogPost() {
    this.isLoading = true;

    return this.apiInternalService
      .getDefaultDraftBlogPost(this.globalVars.loggedInUser.PublicKeyBase58Check)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(
        (draft) => {
          if (!!draft) {
            this.defaultDraftBlogPost = draft;
            this.setSavedDraftBlogPost(draft);
            this.autoSaveDraftBlogPost();
          }
        },
        (e) => {
          console.error(e);
        }
      );
  }

  async getBlogPostToEdit(blogPostHashHex: string): Promise<GetSinglePostResponse> {
    return this.backendApi
      .GetSinglePost(
        blogPostHashHex /*PostHashHex*/,
        this.globalVars.loggedInUser?.PublicKeyBase58Check ?? "" /*ReaderPublicKeyBase58Check*/,
        false /*FetchParents */,
        0 /*CommentOffset*/,
        0 /*CommentLimit*/,
        this.globalVars.showAdminTools() /*AddGlobalFeedBool*/,
        0 /*ThreadLevelLimit*/,
        0 /*ThreadLeafLimit*/,
        false /*LoadAuthorThread*/
      )
      .toPromise();
  }

  onContentChange(content: any) {
    this.contentAsPlainText = content.text;
  }

  async postProcessDelta({ ops }: { ops: any[] }): Promise<{ ops: any[] }> {
    const processedOps = await Promise.all(
      ops.map(async (op: any) => {
        // convert any images from base64 to a File object, upload them, and then replace
        // that image in the Delta object with the link to the uploaded image.
        // This is done to drastically reduce on-chain file size.
        if (has(op, "insert.image") && op.insert.image.substring(0, 5) === "data:") {
          const newFile = dataURLtoFile(op.insert.image, "uploaded_image");
          const res = await this.backendApi
            .UploadImage(this.globalVars.loggedInUser?.PublicKeyBase58Check, newFile)
            .toPromise();
          op.insert.image = res.ImageURL;
        }

        // convert mentions to regular links, since mention operations are a
        // custom op added by the quill mention plugin. On the output side, any
        // app can modify the link if needed but we've chose a widely used
        // convention of `/u/<username>` as the default.
        if (!!op.insert?.mention) {
          const { value, denotationChar } = op.insert.mention;
          return {
            attributes: { link: `/u/${value}` },
            insert: `${denotationChar}${value}`,
          };
        }

        return op;
      })
    );

    return { ops: processedOps };
  }

  async submit(ev: Event) {
    ev.preventDefault();
    if (this.isSubmittingPost) return;

    const currentUserProfile = this.globalVars.loggedInUser?.ProfileEntryResponse;

    if (!currentUserProfile) {
      this.modalService.show(WelcomeModalComponent, { initialState: { triggerAction: "blog-post" } });
      return;
    }

    currentUserProfile.ExtraData = currentUserProfile.ExtraData ?? {};

    // check if the user has enough funds to execute the 2 transactions we need to create a blog post:
    // - 1 create the post
    // - 2 update the user profile with the slug -> profileHashHex mapping
    if ((this.globalVars.loggedInUser?.BalanceNanos ?? 0) < this.globalVars.defaultFeeRateNanosPerKB * 2) {
      this.globalVars._alertError(
        `You don't have enough $DESO to create a blog post. The minimum amount needed is ${
          (this.globalVars.defaultFeeRateNanosPerKB * 2) / 1e9
        } $DESO`
      );
      return;
    }

    const titleSlug = stringToSlug(this.model.Title);
    const existingSlugMappings = JSON.parse(currentUserProfile.ExtraData?.BlogSlugMap ?? "{}");

    // check that there is not a collision with a previous article slug
    if (
      Object.entries(existingSlugMappings).some(
        ([slug, postHashHex]) => titleSlug === slug && postHashHex !== this.editPostHashHex
      )
    ) {
      this.globalVars._alertError(
        "This post has a title that conflicts with one of your previous posts! Please give your post a different title."
      );
      return;
    }

    this.model.validate();

    if (this.model.hasErrors) {
      this.globalVars._alertError(this.model.errors[0]);
      return;
    }

    this.isSubmittingPost = true;

    try {
      this.model.ContentDelta = await this.postProcessDelta(this.model.ContentDelta);

      const twitter = require("../../../vendor/twitter-text-3.1.0.js");
      const entities = Array.from(
        new Set(
          twitter
            .extractEntitiesWithIndices(this.contentAsPlainText, {
              extractUrlsWithoutProtocol: false,
            })
            .filter((entity: any) => entity.screenName || entity.cashtag || entity.hashtag)
            .map((entity: any) => {
              if (entity.screenName) {
                return `@${entity.screenName}`;
              }
              if (entity.cashtag) {
                return `$${entity.cashtag}`;
              }
              if (entity.hashtag) {
                return `#${entity.hashtag}`;
              }
            })
        )
      )
        .sort()
        .reverse()
        .join(" ");

      const postExtraData: BlogPostExtraData = {
        Title: this.model.Title.trim(),
        Description: this.model.Description.trim(),
        BlogDeltaRtfFormat: JSON.stringify(this.model.ContentDelta),
        BlogTitleSlug: titleSlug,
        CoverImage: this.model.CoverImage,
      };

      const permalink = `${window.location.origin}/u/${currentUserProfile.Username}/blog/${titleSlug}`;
      const postTx = await this.backendApi
        .SubmitPost(
          this.globalVars.loggedInUser?.PublicKeyBase58Check,
          this.editPostHashHex ?? "" /*PostHashHexToModify*/,
          "" /*ParentPostHashHex*/,
          {
            Body: `${postExtraData.Title}\n\n${postExtraData.Description}\n\nView this post at ${permalink}${
              entities ? `\n\nMentions: ${entities}` : ""
            }\n\n#blog`,
            ImageURLs: postExtraData.CoverImage ? [postExtraData.CoverImage] : [],
            VideoURLs: null,
          } /*BodyObj*/,
          "" /*RepostedPostHashHex*/,
          postExtraData /*PostExtraData*/,
          false /*IsHidden*/
        )
        .toPromise();

      const submittedPostHashHex = postTx.PostEntryResponse.PostHashHex;

      // if this is a new post, or the author updates the title of an existing
      // post, update the user's profile with a mapping from postHashHex to url
      // slug
      if (!this.editPostHashHex || !existingSlugMappings[titleSlug]) {
        // first, wait for the submitPost tx to show up to prevent any utxo double spend errors.
        await waitForTransactionFound(postTx.TxnHashHex).then(() => {
          if (this.editPostHashHex) {
            return;
          }

          // remove the draft when published
          const IsDefault = this.editedDraftBlogPostId === this.defaultDraftBlogPost?.Id;

          if (IsDefault) {
            // If user posts a default post, we simply reset it
            return this.apiInternalService
              .saveDraftBlogPost(this.globalVars.loggedInUser.PublicKeyBase58Check, {
                Id: this.editedDraftBlogPostId,
                IsDefault,
                UserPublicKeyBase58check: this.globalVars.loggedInUser.PublicKeyBase58Check,
                PostTitle: "",
                PostDescription: "",
                PostDelta: "",
                CoverPhotoUrl: "",
              })
              .subscribe((res) => {
                this.setSavedDraftBlogPost(res);
              });
          } else {
            // If user posts a saved draft, we delete this draft, fetch the default one and show it on the UI
            return this.apiInternalService
              .deleteDraftBlogPost(this.editedDraftBlogPostId, this.globalVars.loggedInUser.PublicKeyBase58Check)
              .subscribe(() => {
                this.getDefaultDraftBlogPost();
              });
          }
        });

        const blogSlugMapJSON = JSON.stringify({
          ...existingSlugMappings,
          [titleSlug]: submittedPostHashHex,
        });

        await this.backendApi
          .UpdateProfile(
            this.globalVars.loggedInUser?.PublicKeyBase58Check,
            "",
            "",
            "",
            "",
            this.globalVars?.loggedInUser?.ProfileEntryResponse?.CoinEntry?.CreatorBasisPoints || 100 * 100,
            1.25 * 100 * 100,
            false,
            { BlogSlugMap: blogSlugMapJSON }
          )
          .toPromise();
        currentUserProfile.ExtraData.BlogSlugMap = blogSlugMapJSON;
      }

      this.toastr.show(
        `Blog Post Created<a href="${permalink}" class="toast-link cursor-pointer">View</a>`,
        undefined,
        {
          toastClass: "info-toast",
          enableHtml: true,
          positionClass: "toast-bottom-center",
        }
      );
    } catch (e: any) {
      console.error(e);
      this.globalVars._alertError(`Whoops, something went wrong...${e.toString()}`);
    }

    this.isSubmittingPost = false;
  }

  onFormInput(ev: Event) {
    ev.preventDefault();
    this.model.clearErrors();
  }

  /**
   * @returns the uploaded image url. empty string if the file invalid.
   */
  async uploadImage(file: File): Promise<string> {
    if (file.size > 15 * (1024 * 1024)) {
      this.globalVars._alertError("File is too large. Please choose a file less than 15MB");
      return "";
    }

    return this.backendApi
      .UploadImage(this.globalVars.loggedInUser?.PublicKeyBase58Check, file)
      .toPromise()
      .then((res) => res.ImageURL)
      .catch((e) => {
        console.error(e);
        this.globalVars._alertError(e.toString());
        return "";
      });
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = true;
  }

  onDragEnter(ev: DragEvent) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = true;
  }

  onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = false;
  }

  onClickSelectFile(ev: DragEvent) {
    ev.preventDefault();
    if (!this.coverImgInput?.nativeElement) {
      this.globalVars._alertError("Whoops, something went wrong. Unable to select files.");
      return;
    }

    this.coverImgInput.nativeElement.click();
  }

  onDropImg(ev: DragEvent) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = false;
    const file = ev?.dataTransfer?.files?.[0];
    if (!file) {
      this.globalVars._alertError(
        "No files were detected. Please try it again. If the error continues, try another file."
      );
      return;
    }

    this.handleCoverImgFileChange(file);
  }

  onFileSelected(ev: Event) {
    ev.preventDefault();
    const file = (ev.currentTarget as HTMLInputElement)?.files?.[0];

    if (!file) {
      this.globalVars._alertError(
        "No files were detected. Please try it again. If the error continues, try another file."
      );
      return;
    }

    this.handleCoverImgFileChange(file);
  }

  async handleCoverImgFileChange(file: File) {
    if (file.size > 15 * (1024 * 1024)) {
      this.globalVars._alertError("File is too large. Please choose a file less than 15MB");
      return "";
    }

    this.coverImageFile = file;

    try {
      await this.uploadImage(this.coverImageFile).then((res) => {
        this.model.CoverImage = res;
      });
    } catch (e: any) {
      console.error(e);
      this.globalVars._alertError(`Whoops, something went wrong when uploading your cover image...${e.toString()}`);
    }
  }

  onRemoveCoverImg(ev: Event) {
    ev.preventDefault();
    this.coverImageFile = undefined;
    this.model.CoverImage = "";
  }

  toggleEditorFocus(state: "collapsed" | "expanded", ref?: HTMLElement) {
    if (ref) {
      setTimeout(() => {
        ref.focus();
      }, 0);
    }
    this.editorState = state;
  }

  formatDraftDate(draftDate: string, withSeconds: boolean = false) {
    const date = new Date(draftDate);

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hour = date.getHours() % 12 || 12;
    const minute = date.getMinutes().toString().padStart(2, "0");
    const second = date.getSeconds().toString().padStart(2, "0");
    const period = date.getHours() < 12 ? "am" : "pm";

    return `${day}/${month}/${year} @ ${hour}:${minute}${withSeconds ? `:${second}` : ""}${period}`;
  }

  private setSavedDraftBlogPost(draft: DraftBlogPostResponse | null) {
    if (!draft) {
      return;
    }

    this.model.Title = draft.PostTitle;
    this.model.Description = draft.PostDescription;
    this.model.ContentDelta = draft.PostDelta ? JSON.parse(draft.PostDelta) : {};
    this.model.CoverImage = draft.CoverPhotoUrl;

    this.editedDraftBlogPostId = draft?.Id ?? "";

    this.lastAutoSavedAt = "";
  }
}

// Naively copied this from here:
// https://gist.github.com/codeguy/6684588?permalink_comment_id=3332719#gistcomment-3332719
// Tested with a few edge cases (special chars, weird spacing, etc) and it did
// fine. May need to revisit if it doesn't handle some edge case properly.
const stringToSlug = (str: string) =>
  str
    .normalize("NFD") // split an accented letter in the base letter and the acent
    .replace(/[\u0300-\u036f]/g, "") // remove all previously split accents
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "") // remove all chars not letters, numbers and spaces (to be replaced)
    .trim()
    .replace(/\s+/g, "-") // replace all spaces with -
    .replace(/-+/g, "-"); // replace multiple - with a single -
