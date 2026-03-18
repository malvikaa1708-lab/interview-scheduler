function parseSlots(message) {
  const parts = message.split(" ")

  // 👉 Extract date
  const day = parts[0]
  const monthName = parts[1]

  const months = {
    January: "01",
    February: "02",
    March: "03",
    April: "04",
    May: "05",
    June: "06",
    July: "07",
    August: "08",
    September: "09",
    October: "10",
    November: "11",
    December: "12"
  }

  const year = new Date().getFullYear()

  const slot_date = `${year}-${months[monthName]}-${day.padStart(2, "0")}`

  // 👉 Extract times
  const times = parts.slice(2)

  const slots = times.map(t => {
    let hour = parseInt(t)
    let minutes = "00"

    if (t.toLowerCase().includes("pm") && hour !== 12) {
      hour += 12
    }

    if (t.toLowerCase().includes("am") && hour === 12) {
      hour = 0
    }

    return {
      date: slot_date,
      time: `${hour.toString().padStart(2, "0")}:${minutes}:00`
    }
  })

  return slots
}

module.exports = parseSlots