import fs from 'fs'
import { startWeaving } from '../src/Weaver.mjs'

async function testWeaver() { 
  const hashFile = fs.readFileSync('./hashing.md', 'utf-8')
  await startWeaving(hashFile)
  
  const hashRingFile = fs.readFileSync('./hashRing.md', 'utf-8')
  await startWeaving(hashRingFile)

  const opensearchFile = fs.readFileSync('./opensearch.md', 'utf-8')
  await startWeaving(opensearchFile)

  const footballFile = fs.readFileSync('./football.md', 'utf-8')
  await startWeaving(footballFile)
}

testWeaver()
