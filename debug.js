import fs from "fs/promises";
import path from "path";

const dir = path.resolve("data");

console.log("Checking directory:", dir);

try {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  console.log("Files inside data/:");
  for (const e of entries) {
    console.log(" -", e.name);
  }
} catch (err) {
  console.error("❌ ERROR:", err.message);
}
