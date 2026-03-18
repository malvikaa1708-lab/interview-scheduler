const { google } = require("googleapis")

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
})

const calendar = google.calendar({ version: "v3", auth: oAuth2Client })

// ✅ Convert "5 May" → "2026-05-05"
function convertToISODate(dateStr) {
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

  const [day, monthName] = dateStr.split(" ")
  const year = new Date().getFullYear()

  return `${year}-${months[monthName]}-${day.padStart(2, "0")}`
}

// ✅ Convert "5:00 pm" → "17:00:00"
function convertTo24Hour(timeStr) {
  timeStr = timeStr.toLowerCase().trim()

  let [time, modifier] = timeStr.split(" ")
  let [hours, minutes] = time.split(":")

  hours = parseInt(hours)
  minutes = minutes ? parseInt(minutes) : 0

  if (modifier === "pm" && hours !== 12) hours += 12
  if (modifier === "am" && hours === 12) hours = 0

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:00`
}

// ✅ FIXED IST → UTC conversion
function createISTDateTime(date, time) {
  const [year, month, day] = date.split("-").map(Number)
  const [hours, minutes, seconds] = time.split(":").map(Number)

  return new Date(Date.UTC(
    year,
    month - 1,
    day,
    hours - 5,
    minutes - 30,
    seconds || 0
  ))
}

async function createCalendarEvent({ date, time, candidateEmail, managerEmail }) {
  try {

    // 🔥 FIX: convert before using
    const isoDate = convertToISODate(date)
    const isoTime = convertTo24Hour(time)

    console.log("✅ ISO DATE:", isoDate)
    console.log("✅ ISO TIME:", isoTime)

    const start = createISTDateTime(isoDate, isoTime)
    const end = new Date(start.getTime() + 30 * 60000)

    const event = {
      summary: "Interview",

      start: {
        dateTime: start.toISOString(),
        timeZone: "Asia/Kolkata"
      },

      end: {
        dateTime: end.toISOString(),
        timeZone: "Asia/Kolkata"
      },

      attendees: [
        { email: candidateEmail },
        { email: managerEmail }
      ]
    }

    const res = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: "all" // ✅ email invite
    })

    console.log("✅ Event created:", res.data.htmlLink)

  } catch (error) {
    console.error("❌ GOOGLE ERROR:", error.response?.data || error.message)
  }
}

module.exports = createCalendarEvent