/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          600: "#1e3a5f",
          700: "#162d4a",
          800: "#0f1f33",
        },
      },
    },
  },
  plugins: [],
};
