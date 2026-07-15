export type GuidedHelpFaq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type GuidedHelpFaqInput = {
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
};
