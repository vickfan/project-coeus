import fs from 'fs'

function main() {
  const notes = fs.readFileSync('notes/test.md', 'utf8')
  console.log(notes)
}

main()