type Post = {
  Comments: any[] | null;
};

export type Thread = {
  parent: Post;
  children: any[];
};

const walkSubcomments = (subComment: Post, cb: Function): void => {
  cb(subComment);
  if (Array.isArray(subComment?.Comments)) {
    subComment.Comments.forEach((comment) => {
      walkSubcomments(comment, cb);
    });
  }
};

/**
 * Takes a tree of posts/comments and flattens it to a linear list for rendering
 * in the UI.
 */
export function flattenThread(parent: Post): Thread {
  let thread = {
    parent,
    children: [],
  };

  if (Array.isArray(parent.Comments)) {
    parent.Comments.forEach((comment) => {
      walkSubcomments(comment, (subComment) => {
        thread.children.push(subComment);
      });
    });
  }

  return thread;
}

export class ThreadManager {
  // We don't want any outside sets on this
  private threadMap = new Map();

  private threadArrayCache;

  get threadCount() {
    return this.threadMap.size;
  }

  get threads() {
    if (this.threadArrayCache) {
      return this.threadArrayCache;
    }
    this.threadArrayCache = Array.from(this.threadMap.values());

    return this.threadArrayCache;
  }

  constructor(rootPost) {
    this.addThreads(rootPost.Comments);
  }

  getThread(parentPostHashHex) {
    return this.threadMap.get(parentPostHashHex);
  }

  addThreads(comments) {
    if (!Array.isArray(comments)) {
      return;
    }

    comments.forEach((comment) => {
      this.addThread(comment);
    });
  }

  addThread(comment) {
    if (this.threadArrayCache) {
      this.threadArrayCache = undefined;
    }

    this.threadMap.set(comment.PostHashHex, flattenThread(comment));
  }

  addReplyToThread(threadPostHashHex, replyingToComment, reply) {
    const thread = this.threadMap.get(threadPostHashHex);
    const lastChild = thread.children.length ? thread.children[thread.children.length - 1] : null;

    if (replyingToComment.PostHashHex === threadPostHashHex && !lastChild) {
      // increment the parent count && push its first child
      thread.parent = {
        ...thread.parent,
        CommentCount: thread.parent.CommentCount + 1,
      };
      thread.children = [reply];
    } else if (replyingToComment.PostHashHex === lastChild?.PostHashHex) {
      // increment count for reply parent and push a new last node
      const prevLastChild = {
        ...lastChild,
        CommentCount: lastChild.CommentCount + 1,
      };
      thread.parent = { ...thread.parent };
      thread.children = [...thread.children.slice(0, thread.children.length - 1), prevLastChild, reply];
    } else if (replyingToComment.PostHashHex === threadPostHashHex) {
      // we've replied to a thread parent that already has replies. We
      // just increment its count
      thread.parent = {
        ...thread.parent,
        CommentCount: thread.parent.CommentCount + 1,
      };
    } else {
      // we must have replied to something in the middle of a thread. just
      // increment the reply parent's count.
      const replaceNode = {
        ...replyingToComment,
        CommentCount: replyingToComment.CommentCount + 1,
      };
      const indexToReplace = thread.children.findIndex((child) => child.PostHashHex === replyingToComment.PostHashHex);
      thread.parent = { ...thread.parent };
      thread.children = [
        ...thread.children.slice(0, indexToReplace),
        replaceNode,
        ...thread.children.slice(indexToReplace + 1, thread.children.length),
      ];
    }
  }
}
