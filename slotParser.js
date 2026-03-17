function parseSlots(text) {

const lines = text.split("\n")
const slots = []

lines.forEach(line => {

const parts = line.split(" ")

const day = parts[0]
const month = parts[1]

const times = parts.slice(2)

const monthMap = {
January:1, February:2, March:3, April:4,
May:5, June:6, July:7, August:8,
September:9, October:10, November:11, December:12
}

const monthNumber = monthMap[month]

const year = new Date().getFullYear()

const date = `${year}-${monthNumber}-${day}`

times.forEach(t => {

let hour = parseInt(t)
let minute = "00"

if(t.toLowerCase().includes("pm") && hour !== 12){
hour += 12
}

if(t.toLowerCase().includes("am") && hour === 12){
hour = 0
}

slots.push({
date: date,
time: `${hour}:${minute}:00`
})

})

})

return slots
}

module.exports = parseSlots