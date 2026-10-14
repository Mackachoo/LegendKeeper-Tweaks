const files = process.argv.slice(2).length ? process.argv.slice(2) : ['./markdown.test.ts', './server.test.ts']
let failed = 0
let passed = 0
for (const file of files) {
  const mod = await import(file.startsWith('.') ? new URL(file, import.meta.url).href : file)
  for (const [name, fn] of mod.tests as [string, () => unknown][]) {
    try {
      await fn()
      passed++
      console.log(`  ok  ${name}`)
    } catch (error) {
      failed++
      console.log(`  FAIL ${name}\n${(error as Error).stack ?? error}`)
    }
  }
  await mod.teardown?.()
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
