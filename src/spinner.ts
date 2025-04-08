import * as notion from './notion'
import * as util from './util'

const SPINNER_FRAMES = ['⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏', '⠋']
const SPINNER_UPDATE_SPEED = 100 // milliseconds
const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
}

let spinnerInterval: NodeJS.Timeout
let spinnerFrame: number = 0
let startTime: Date

export function start() {
  startTime = new Date()

  // Hide cursor
  process.stdout.write('\x1b[?25l')

  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${SPINNER_FRAMES[spinnerFrame]}`)
    spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length
  }, SPINNER_UPDATE_SPEED)
}

export function stop() {
  const stopTime = new Date()
  const duration = (stopTime.getTime() - startTime.getTime()) / 1000
  const minutes = Math.floor(duration / 60)
  const seconds = Math.round(duration % 60)

  // Clear remaining spinner frame
  process.stdout.write('\r\x1b[K')
  // Show cursor
  process.stdout.write('\x1b[?25h')

  // Print metrics
  console.log(`\x1b[1m\x1b[32m✔\x1b[0m Completion time: \x1b[1m\x1b[34m${stopTime.toLocaleString('en-US', DATE_TIME_FORMAT_OPTIONS)}\x1b[0m`)
  console.log(`\x1b[1m\x1b[32m✔\x1b[0m Script run time: \x1b[1m\x1b[32m${minutes}m ${seconds}s\x1b[0m`)
  console.log(`\x1b[1m\x1b[32m✔\x1b[0m Notion requests: \x1b[1m\x1b[33m${notion.requests()}\x1b[0m`)

  // Print warnings
  Object.keys(util.warnings)
    .sort()
    .forEach(pageTitle => {
      const types = [...util.warnings[pageTitle]].sort().join(', ')
      console.log(`\x1b[1m\x1b[33m✱ Warning:\x1b[0m \x1b[90m${pageTitle}\x1b[0m contains omitted type: ${types}`)
    })

  clearInterval(spinnerInterval)
}
