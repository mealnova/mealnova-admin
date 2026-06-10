export declare function normalizeBlogCategoryId(value: string | null | undefined): string;
export declare function getBlogCategoryQueryValues(value: string | null | undefined): string[];
export declare function formatBlogCategoryLabel(value: string | null | undefined): string;
export declare function buildBlogCategoryOptions(values: Array<string | null | undefined | {
    id?: string | null;
    label?: string | null;
}>): {
    id: string;
    label: string;
}[];
