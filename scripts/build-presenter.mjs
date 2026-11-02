// Builds the app and puts it inside the Presenter, which serves it to phones. Run with: npm run build:presenter
import { cpSync, existsSync, rmSync } from "node:fs"
import { execSync } from "node:child_process"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const presenter = resolve(process.env.JAMC_PRESENTER ?? join(root, "..", "jamc-worship-presenter"))
const target = join(presenter, "src", "main", "resources", "remote-app")

if (!existsSync(join(presenter, "pom.xml"))) {
  console.error(`Presenter project not found at ${presenter}. Set JAMC_PRESENTER to its folder.`)
  process.exit(1)
}
execSync("npm run build", { cwd: root, stdio: "inherit" })
rmSync(target, { recursive: true, force: true })
cpSync(join(root, "dist"), target, { recursive: true })
console.log(`Copied dist/ to ${target}`)
