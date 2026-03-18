const { google } = require("googleapis")

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
})
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

  const year = new Date().getFullYear()   // current year

  return `${year}-${months[monthName]}-${day.padStart(2, "0")}`
}

const calendar = google.calendar({ version: "v3", auth: oAuth2Client })

async function createCalendarEvent({ date, time, candidateEmail, managerEmail }) {

  try {

    const [hours, minutes, seconds] = time.split(":")

    const start = new Date(date)   // date = "2026-03-25"

start.setHours(
  parseInt(hours),
  parseInt(minutes),
  parseInt(seconds || "0")
)

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
        { email: candidateEmail, responseStatus: "needsAction" },
        { email: managerEmail, responseStatus: "needsAction" }
        
      ]
    }

    const res = await calendar.events.insert({
     calendarId: "primary",
     resource: event,
     conferenceDataVersion: 1,
     sendUpdates: "all",   // ✅ MUST
  })

    console.log("✅ Event created:", res.data.htmlLink)

  } catch (error) {
    console.error("❌ GOOGLE ERROR:", error.response?.data || error.message)
  }
}

module.exports = createCalendarEvent