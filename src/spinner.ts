import * as notion from './notion'

const spinnerFrames = ['⠷', '⠯', '⠟', '⠻', '⠽', '⠾']
const spinnerUpdateSpeed = 100 // milliseconds

let spinnerInterval: NodeJS.Timeout
let spinnerFrame = 0
let duration = 0

export function start() {
  process.stdout.write('\x1b[?25l') // Hide cursor

  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${spinnerFrames[spinnerFrame]}`)
    spinnerFrame = (spinnerFrame + 1) % spinnerFrames.length
    duration++
  }, spinnerUpdateSpeed)
}

export function stop() {
  const seconds = duration / (1000 / spinnerUpdateSpeed)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  process.stdout.write('\r\x1b[K') // Clear remaining spinner frame
  process.stdout.write('\x1b[?25h') // Show cursor
  process.stdout.write('\x1b[1m\x1b[32m✔\x1b[0m Script run time: ')

  if (minutes > 0) {
    console.log(`\x1b[1m\x1b[32m${minutes}m ${remainingSeconds}s\x1b[0m`)
  } else {
    console.log(`\x1b[1m\x1b[32m${seconds}s\x1b[0m`)
  }

  console.log(`\x1b[1m\x1b[32m✔\x1b[0m Notion requests: \x1b[1m\x1b[33m${notion.requests}\x1b[0m`)

  clearInterval(spinnerInterval)
}
