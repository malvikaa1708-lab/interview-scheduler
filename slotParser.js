function parseSlots(message) {
  const parts = message.split(" ")

  // 👉 Extract date
  const day = parts[0]
  const monthName = parts[1]

  const months = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12"
  }

  const year = new Date().getFullYear()
  const month = months[monthName]

  if (!month) {
    console.log("❌ Invalid month:", monthName)
    return []
  }

  const slot_date = `${year}-${month}-${day.padStart(2, "0")}`

  // 👉 FIX: Combine time + am/pm
  const timePairs = []
  for (let i = 2; i < parts.length; i += 2) {
    timePairs.push(parts[i] + " " + parts[i + 1])
  }

  const slots = timePairs.map(t => {
    const [time, modifier] = t.split(" ")
    let [hour, minute] = time.split(":")

    hour = parseInt(hour)
    minute = minute || "00"

    if (modifier.toLowerCase() === "pm" && hour !== 12) {
      hour += 12
    }

    if (modifier.toLowerCase() === "am" && hour === 12) {
      hour = 0
    }

    return {
      date: slot_date,
      time: `${hour.toString().padStart(2, "0")}:${minute}:00`
    }
  })

  return slots
}

module.exports = parseSlots