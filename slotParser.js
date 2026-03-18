function parseSlots(message) {
  const parts = message.split(" ")

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

  // 👉 FIX: handle "2pm", "5pm", "2:30pm", etc.
  const timeParts = parts.slice(2)

  const slots = timeParts.map(t => {
    const match = t.match(/(\d{1,2})(?::(\d{2}))?(am|pm)/i)

    if (!match) {
      console.log("❌ Invalid time format:", t)
      return null
    }

    let hour = parseInt(match[1])
    let minute = match[2] || "00"
    const modifier = match[3].toLowerCase()

    if (modifier === "pm" && hour !== 12) hour += 12
    if (modifier === "am" && hour === 12) hour = 0

    return {
      date: slot_date,
      time: `${hour.toString().padStart(2, "0")}:${minute}:00`
    }
  }).filter(Boolean)

  return slots
}

module.exports = parseSlots