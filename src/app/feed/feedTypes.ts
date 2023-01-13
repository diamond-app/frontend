export enum AssociationType {
  reaction = "REACTION",
}

export enum AssociationReactionValue {
  LIKE = "LIKE",
  DISLIKE = "DISLIKE",
  LOVE = "LOVE",
  LAUGH = "LAUGH",
  ASTONISHED = "ASTONISHED",
  SAD = "SAD",
  ANGRY = "ANGRY",
}

export const AssociationReactionDetails = {
  [AssociationReactionValue.LIKE]: {
    imageUrl: "👍",
    value: AssociationReactionValue.LIKE,
  },
  [AssociationReactionValue.DISLIKE]: {
    imageUrl: "👎",
    value: AssociationReactionValue.DISLIKE,
  },
  [AssociationReactionValue.LOVE]: {
    imageUrl: "❤️",
    value: AssociationReactionValue.LOVE,
  },
  [AssociationReactionValue.LAUGH]: {
    imageUrl: "😂",
    value: AssociationReactionValue.LAUGH,
  },
  [AssociationReactionValue.ASTONISHED]: {
    imageUrl: "😲",
    value: AssociationReactionValue.ASTONISHED,
  },
  [AssociationReactionValue.SAD]: {
    imageUrl: "😢",
    value: AssociationReactionValue.SAD,
  },
  [AssociationReactionValue.ANGRY]: {
    imageUrl: "😡",
    value: AssociationReactionValue.ANGRY,
  },
};

export interface AssociationReactionTransaction {
  TransactorPkId: string;
  PostHash: string;
  AssociationType: AssociationType.reaction;
  AssociationValue: AssociationReactionValue;
  ExtraData: any;
}

export interface PostReactionCountsResponse {
  Counts: Array<{ [key in AssociationReactionValue]: number }>;
  Total: number;
}
