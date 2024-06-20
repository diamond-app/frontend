import {
  ChangeDetectorRef,
  Component,
  ContentChild,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef,
} from "@angular/core";
import { GlobalVarsService } from "../global-vars.service";
import { TranslocoService } from "@jsverse/transloco";

@Component({
  selector: "swipe-to-choose",
  templateUrl: "./swipe-to-choose.component.html",
  styleUrls: ["./swipe-to-choose.component.scss"],
})
export class SwipeToChooseComponent implements OnInit {
  @Input() itemCount: number = 0;

  @Output() sendOne = new EventEmitter();
  @Output() selectItem = new EventEmitter();

  @ContentChild("actionBtn", { static: false }) actionBtn: TemplateRef<any>;
  @ContentChild("item", { static: false }) item: TemplateRef<any>;

  // Indexes from 0 to itemCount (used by *ngFor)
  itemIndexes = [];
  itemDragging = false;
  // Which item is selected by the drag selector
  itemIdxDraggedTo = -1;
  // Whether the drag selector is at the bottom of it's bound and in position to cancel a transaction
  itemDragCancel = false;
  itemDragLeftExplainer = false;
  // Track if the dragged item actually moved, so that we can distinguish between drags and clicks
  itemDragMoved = false;
  // Track when the drag began, if less than .1 seconds ago, and the drag didn't move, assume it was a click
  itemDragStarted: Date;
  // Controls visibility of selectable item levels. Initialize to false.
  itemTimeouts: NodeJS.Timer[] = [];
  // Store timeout functions so that they can be cancelled prematurely
  itemsVisible = Array<boolean>(this.itemCount).fill(false);
  // How quickly the items sequentially appear on hover
  itemAnimationDelay = 50;

  constructor(
    public globalVars: GlobalVarsService,
    private ref: ChangeDetectorRef,
    private translocoService: TranslocoService
  ) {}

  ngOnInit() {
    this.itemIndexes = Array<number>(this.itemCount)
      .fill(0)
      .map((x, i) => i);
  }

  itemDraggedText() {
    const textKey = !this.itemDragMoved
      ? "feed_post_icon_row.slide"
      : this.itemDragCancel
      ? "feed_post_icon_row.release_to_cancel"
      : "feed_post_icon_row.slide_to_cancel";
    return this.translocoService.translate(textKey);
  }

  // Initiate mobile drag, have items appear
  startDrag() {
    this.globalVars.userIsDragging = true;
    this.itemDragMoved = false;
    this.itemDragStarted = new Date();
    this.itemDragging = true;
    this.addItemSelection({ type: "initiateDrag" });
    this.ref.detectChanges();
  }

  // Calculate where the drag box has been dragged to, make updates accordingly
  duringDrag(event) {
    // If this event was triggered, the user moved the drag box, and we assume it's not a click.
    this.itemDragMoved = true;
    // Establish a margin to the left and right in order to improve reachability
    const pageMargin = window.innerWidth * 0.15;
    // The width of the page minus the margins
    const selectableWidth = window.innerWidth - 2 * pageMargin;
    // If the selector is in the left margin, choose the first option
    if (event.pointerPosition.x < pageMargin) {
      this.itemIdxDraggedTo = 0;
      // If the selector is in the right margin, choose the last option
    } else if (event.pointerPosition.x > selectableWidth + pageMargin) {
      this.itemIdxDraggedTo = this.itemCount - 1;
    } else {
      // If the selector is in the middle, calculate what % of the middle it has been dragged to, assign a item value
      this.itemIdxDraggedTo = Math.ceil(
        ((event.pointerPosition.x - pageMargin) / selectableWidth) * this.itemCount - 1
      );
    }
    // If the selector has been dragged out of the right margin, enable the helper text
    // (we don't want every drag event to start with the helper text enabled)
    if (this.itemIdxDraggedTo != this.itemCount - 1) {
      this.itemDragLeftExplainer = true;
    }
    // If the drag box is at the alloted lower boundry or below, set confirm status to true
    this.itemDragCancel = event.distance.y > 30;
    this.ref.detectChanges();
  }

  // Triggered on end of a touch. If we determine this was a "click" event, send 1 item. Otherwise nothing
  dragClick(event) {
    const now = new Date();
    // If the drag box wasn't moved and less than 200ms have transpired since the start of the tap,
    // assume this was a click and send 1 item
    if (!this.itemDragMoved) {
      if (now.getTime() - this.itemDragStarted.getTime() < 200) {
        // Prevent touch event from propagating
        event.preventDefault();
        this.sendOne.emit(event);
      }
      // If the item drag box wasn't moved, we need to reset these variables.
      // If it was moved, the endDrag fn will do it.
      this.resetDragVariables();
    }
    this.ref.detectChanges();
  }

  // End dragging procedure. Triggered when the dragged element is released
  endDrag(event) {
    // Stop the drag event so that the slider isn't visible during transaction load
    this.itemDragging = false;
    this.itemsVisible = this.itemsVisible.map(() => false);
    // If the drag box is not in the "cancel" position, and the selected item makes sense, send items
    if (!this.itemDragCancel && this.itemIdxDraggedTo > -1 && this.itemIdxDraggedTo < this.itemCount) {
      this.selectItem.emit(this.itemIdxDraggedTo);
    }
    // Reset drag-related variables
    this.resetDragVariables();
    // Move the drag box back to it's original position
    event.source._dragRef.reset();
    this.ref.detectChanges();
  }

  resetDragVariables() {
    this.globalVars.userIsDragging = false;
    this.itemDragCancel = false;
    this.itemDragging = false;
    this.itemIdxDraggedTo = -1;
    this.itemDragMoved = false;
    this.itemDragLeftExplainer = false;
    this.ref.detectChanges();
  }

  addItemSelection(event) {
    // Need to make sure hover event doesn't trigger on child elements
    if (event?.type === "initiateDrag") {
      for (let idx = 0; idx < this.itemCount; idx++) {
        this.itemTimeouts[idx] = setTimeout(() => {
          this.itemsVisible[idx] = true;
          this.ref.detectChanges();
        }, idx * this.itemAnimationDelay);
      }
    }
  }
}
