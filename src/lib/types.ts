export type Step = {
  text: string;
  /** Section heading from HowToSection, if the recipe groups its steps. */
  section?: string;
};

export type RecipeOrigin = "link" | "mealdb" | "builtin";

export type Recipe = {
  id: string;
  origin?: RecipeOrigin;
  /** Original page, when there is one. Built-in recipes have none. */
  sourceUrl?: string;
  siteName?: string;
  title: string;
  description?: string;
  image?: string;
  /** Cover color for recipes without a photo. */
  accent?: string;
  author?: string;
  yield?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  totalMinutes?: number;
  tags?: string[];
  ingredients: string[];
  steps: Step[];
  savedAt: number;
};
