export const sanitize = (text: string): string => {
  if (text) {
    return text
      .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/[\u2013\u2014]/g, '-') // En/em dash
      .replace(/\u2026/g, '...') // Horizontal ellipsis
      .replace(/\u2002/g, ' '); // En space
  }
  return text;
};
