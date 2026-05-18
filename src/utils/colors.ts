const profileColors = [
  "#A8E6CF", // Mint
  "#FFD3B6", // Peach
  "#FF8B94", // Coral
  "#DCEDC1", // Light Green
  "#98DFEA", // Light Blue
  "#FFAAA5", // Salmon
  "#FFB7B2", // Light Pink
  "#B4F8C8", // Soft Green

  // Additional Colors
  "#B5EAD7", // Sage
  "#C7CEEA", // Periwinkle
  "#E2F0CB", // Light Lime
  "#FFDAC1", // Light Peach
  "#E0BBE4", // Lavender
  "#957DAD", // Dusty Purple
  "#D291BC", // Rose Pink
  "#FEC8D8", // Pink
  "#F7D794", // Mellow Yellow
  "#8FC1A9", // Forest Mint
  "#7098DA", // Steel Blue
  "#B8E0D2", // Aqua
  "#95B8D1", // Sky Blue
  "#D4A5A5", // Dusty Rose
  "#9DBEBB", // Sage Green
  "#B9CDDA", // Light Steel Blue
  "#DCEDC2", // Light Chartreuse
  "#FFD3B5", // Light Coral
  "#D6E2E9", // Ice Blue
  "#F9C0C0", // Light Salmon
];

const getRandomProfileColor = () => {
  return profileColors[Math.floor(Math.random() * profileColors.length)];
};

export { profileColors, getRandomProfileColor };
