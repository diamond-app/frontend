type Post = {
  Comments: any[] | null;
};

type Thread = {
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

  if (thread.children.length) {
    thread.children[thread.children.length - 1].isLastNode = true;
  }

  return thread;
}
