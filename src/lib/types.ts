export type Step = {
  text: string;
  /** Section heading from HowToSection, if the recipe groups its steps. */
  section?: string;
};

export type Recipe = {
  id: string;
  sourceUrl: string;
  siteName?: string;
  title: string;
  description?: string;
  image?: string;
  author?: string;
  yield?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  totalMinutes?: number;
  ingredients: string[];
  steps: Step[];
  savedAt: number;
};
