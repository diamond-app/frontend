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

export class Mentionify {
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
