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
function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): { top: number; left: number; height: number } {
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
    height: span.offsetHeight,
  };

  div.remove();

  return coordinates;
}

export class Mentionify<Type> {
  private readonly ref: HTMLTextAreaElement;
  private menuRef: HTMLElement;
  private readonly resolveFn: (string) => Promise<Type[]>;
  private readonly replaceFn: (item: Type, value: string) => string;
  private readonly menuItemFn: (item: Type, setItem: () => void, selected: boolean) => HTMLElement;
  private readonly setInputValueFn: (mention: string) => void;
  private options: { query: string; items: Type[] };
  private left: number | undefined;
  private top: number | undefined;
  private triggerIdx: number | undefined;
  private active: number;
  private currentToken: string;

  constructor(
    ref: HTMLTextAreaElement,
    menuRef: HTMLElement,
    resolveFn: (string) => Promise<Type[]>,
    replaceFn: (item: Type, value: string) => string,
    menuItemFn: (item: Type, setItem: () => void, selected: boolean) => HTMLElement,
    setInputValueFn: (mention: string) => void
  ) {
    this.ref = ref;
    this.menuRef = menuRef;
    this.resolveFn = resolveFn;
    this.replaceFn = replaceFn;
    this.menuItemFn = menuItemFn;
    this.setInputValueFn = setInputValueFn;
    this.options = { query: "", items: [] };
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

  async makeOptions(query: string): Promise<void> {
    const items = await this.resolveFn(query);
    if (items.length !== 0 && this.currentToken) {
      // Only render the menu if the this query starts with the current token or the current token starts with this query.
      if (this.isZeroBasedSubstring(query, this.currentToken)) {
        // Now we need to determine if the query in options is closer to the current token than the query we have here.
        // We can simply compare the length of the strings.
        // There are three conditions in which we'll want to update the menu.
        // 1. If the length of this new query is closer to the length of currentToken than the length of query stored in options.
        // 2. The difference between the length of the current token and lengths of both the new query and the query
        //  stored in options are the same length AND the length of the new query is less than the length of the query stored in options.
        // 3. The query in options is not a zero-based substring of current token.
        const currentTokenLength = this.currentToken.length;
        const currentQueryLength = this.options.query.length;
        const currentLengthDiff = Math.abs(currentQueryLength - currentTokenLength);
        const newQueryLength = query.length;
        const newLengthDiff = Math.abs(newQueryLength - currentTokenLength);
        if (
          newLengthDiff < currentLengthDiff ||
          (newLengthDiff === currentLengthDiff && newQueryLength < currentTokenLength) ||
          !this.isZeroBasedSubstring(this.options.query, this.currentToken)
        ) {
          this.options = { query: query, items: items };
          this.renderMenu();
        }
      }
    } else {
      this.closeMenu();
    }
  }

  // Returns true if either str1 starts with str2 or str2 starts with str1
  isZeroBasedSubstring(str1: string, str2: string): boolean {
    return str1.length > str2.length ? str1.startsWith(str2) : str2.startsWith(str1);
  }

  // Deletes all options from menu and resets state so that no options appear.
  closeMenu(): void {
    setTimeout(() => {
      this.options = { query: "", items: [] };
      this.left = undefined;
      this.top = undefined;
      this.triggerIdx = undefined;
      this.currentToken = "";
      this.renderMenu();
    }, 0);
  }

  // Handles the click action on an item in the mention. When a user name is clicked, it closes the menu and fills in
  // the username mention.
  selectItem(active: number): () => void {
    return () => {
      const preMention = this.ref.value.substr(0, this.triggerIdx);
      const option = this.options.items[active];
      const mention = this.replaceFn(option, this.ref.value[this.triggerIdx]);
      const postMention = this.ref.value.substr(this.ref.selectionStart);
      this.setInputValueFn(`${preMention}${mention}${postMention}`);
      const caretPosition = this.ref.value.length - postMention.length;
      this.ref.setSelectionRange(caretPosition, caretPosition);
      this.closeMenu();
      this.ref.focus();
    };
  }

  onInput(ev: KeyboardEvent): void {
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
    this.makeOptions(query).then(() => {
      const coords = getCaretCoordinates(this.ref, positionIndex);
      const { top, left } = this.ref.getBoundingClientRect();
      let modalTop = 0;
      let modalLeft = 0;
      const modal = document.querySelector(".modal-content");
      let scrollX = window.scrollX;
      let scrollY = window.scrollY;
      if (modal) {
        const modalBoundingClientRect = modal.getBoundingClientRect();
        modalLeft = modalBoundingClientRect.left;
        modalTop = modalBoundingClientRect.top;
        scrollX = 0;
        scrollY = 0;
      }

      setTimeout(() => {
        this.active = 0;
        this.left = scrollX + coords.left + left + this.ref.scrollLeft - modalLeft;
        this.top = scrollY + coords.top + top + coords.height - this.ref.scrollTop - modalTop;
        this.triggerIdx = triggerIdx;
        this.renderMenu();
      }, 0);
    });
  }

  onKeyDown(ev: KeyboardEvent): void {
    let keyCaught = false;
    if (this.triggerIdx !== undefined) {
      switch (ev.key) {
        case "ArrowDown":
          this.active = Math.min(this.active + 1, this.options.items.length - 1);
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

  renderMenu(): void {
    if (this.top === undefined) {
      this.menuRef.hidden = true;
      return;
    }

    this.menuRef.style.left = this.left + "px";
    this.menuRef.style.top = this.top + "px";
    this.menuRef.innerHTML = "";

    this.options.items.forEach((option, idx) => {
      this.menuRef.appendChild(this.menuItemFn(option, this.selectItem(idx), this.active === idx));
    });

    this.menuRef.hidden = false;
  }
}
