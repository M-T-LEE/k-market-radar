/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#06142B",
          900: "#071B35",
          800: "#0B274A",
          700: "#113A67"
        },
        radar: {
          blue: "#2563EB",
          teal: "#14B8A6",
          amber: "#F59E0B",
          red: "#EF4444",
          ink: "#0F172A",
          muted: "#64748B",
          line: "#D8E2EF",
          bg: "#F6F8FB"
        }
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.07)"
      }
    }
  },
  plugins: []
};
