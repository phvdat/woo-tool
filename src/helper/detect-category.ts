function detectCategory(
  productName: string,
  categoryKeywords: {
    [key: string]: string[];
  }
): string {
  const name = productName.toLowerCase();

  const allKeywords: { category: string; keyword: string; priority: number }[] =
    [];

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (let rawKeyword of keywords) {
      let keyword = rawKeyword;
      let priority = 0;

      // Xác định priority dựa vào số lượng dấu * bao quanh
      switch (true) {
        case /^\*\*\*(.+)\*\*\*$/.test(rawKeyword):
          priority = 3;
          keyword = rawKeyword.replace(/^\*\*\*(.+)\*\*\*$/, '$1');
          break;

        case /^\*\*(.+)\*\*$/.test(rawKeyword):
          priority = 2;
          keyword = rawKeyword.replace(/^\*\*(.+)\*\*$/, '$1');
          break;

        case /^\*(.+)\*$/.test(rawKeyword):
          priority = 1;
          keyword = rawKeyword.replace(/^\*(.+)\*$/, '$1');
          break;

        default:
          priority = 0;
          keyword = rawKeyword;
      }

      allKeywords.push({
        category,
        keyword: keyword.toLowerCase(),
        priority,
      });
    }
  }

  allKeywords.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.keyword.length - a.keyword.length;
  });

  for (const { category, keyword } of allKeywords) {
    if (name.includes(keyword)) {
      return category;
    }
  }

  return '';
}

export default detectCategory;
