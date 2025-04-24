function detectCategory(
  productName: string,
  categoryKeywords: {
    [key: string]: string[];
  }
): string {
  const name = productName.toLowerCase();

  const allKeywords: { category: string; keyword: string }[] = [];

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      allKeywords.push({ category, keyword: keyword.toLowerCase() });
    }
  }

  allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

  for (const { category, keyword } of allKeywords) {
    if (name.includes(keyword)) {
      return category;
    }
  }

  return '';
}

export default detectCategory;
