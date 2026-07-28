export const extractHashtags = (content: string): string[] => {
  const matches = content.match(/#(\w+)/g) || [];
  const tags = matches.map((tag) => tag.slice(1).toLowerCase());

  return Array.from(new Set(tags));
};