export type ReadCvGeneral = {
  profilePhoto: string;
  displayName: string;
  byline: string;
  website?: string;
  websiteURL?: string;
  about?: string;
};

export type ReadCvCollectionItem = {
  id?: string;
  year?: string;
  heading?: string;
  url?: string | null;
  location?: string | null;
  description?: string | null;
  platform?: string;
  handle?: string;
  attachments?: Array<{
    type: "image" | "video";
    url: string;
    width: number;
    height: number;
  }>;
};

export type ReadCvCollection = {
  name: string;
  items: ReadCvCollectionItem[];
};

export type ReadCvData = {
  general: ReadCvGeneral;
  allCollections: ReadCvCollection[];
};
