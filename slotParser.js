function convertToISODate(dateStr) {
  const months = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12"
  }

  const [day, monthName] = dateStr.split(" ")
  const year = new Date().getFullYear()

  if (!months[monthName]) {
    console.log("❌ Invalid month:", monthName)
    return null
  }

  return `${year}-${months[monthName]}-${day.padStart(2, "0")}`
}

function convertTo24Hour(timeStr) {
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?(am|pm)/i)

  if (!match) {
    console.log("❌ Invalid time format:", timeStr)
    return null
  }

  let hour = parseInt(match[1])
  let minute = match[2] || "00"
  const modifier = match[3].toLowerCase()

  if (modifier === "pm" && hour !== 12) hour += 12
  if (modifier === "am" && hour === 12) hour = 0

  return `${hour.toString().padStart(2, "0")}:${minute}:00`
}

function parseSlots(message) {

  const parts = message.trim().split(/\s+/)
  const slots = []

  let currentDate = null

  for (let i = 0; i < parts.length; i++) {

    const word = parts[i]

    // ✅ Detect date (number + month)
    if (!isNaN(word) && parts[i + 1]) {
      const possibleDate = `${word} ${parts[i + 1]}`
      const isoDate = convertToISODate(possibleDate)

      if (isoDate) {
        currentDate = isoDate
        i++ // skip month
        continue
      }
    }

    // ✅ Detect time
    if (word.toLowerCase().includes("am") || word.toLowerCase().includes("pm")) {

      if (!currentDate) {
        console.log("⚠️ Time found without date:", word)
        continue
      }

      const time = convertTo24Hour(word)

      if (time) {
        slots.push({
          date: currentDate,
          time: time
        })
      }
    }
  }

  return slots
}

module.exports = parseSlots