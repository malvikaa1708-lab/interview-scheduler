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

// ✅ FIXED DATE FUNCTION (NO MORE 2001 BUG)
function createISTDateTime(date, time) {
  const [year, month, day] = date.split("-").map(Number)
  const [hours, minutes, seconds] = time.split(":").map(Number)

  // Convert IST → UTC manually
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

    console.log("📅 FINAL DATE:", date)
    console.log("⏰ FINAL TIME:", time)

    const start = createISTDateTime(date, time)
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
      sendUpdates: "all"   // ✅ email invite trigger
    })

    console.log("✅ Event created:", res.data.htmlLink)

  } catch (error) {
    console.error("❌ GOOGLE ERROR:", error.response?.data || error.message)
  }
}

module.exports = createCalendarEvent