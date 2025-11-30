import { twMerge } from "tailwind-merge";

const config = {
  plugins: {
    "@tailwind-expand/postcss": { mergerFn: twMerge },
    "@tailwindcss/postcss": {},
  },
};

export default config;
