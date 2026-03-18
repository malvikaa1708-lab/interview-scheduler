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

async function createCalendarEvent({ date, time, candidateEmail, managerEmail }) {

  const start = new Date(`${date}T${time}`)
  const end = new Date(start.getTime() + 30 * 60000)

  const event = {
    summary: "Interview",
    description: "Scheduled via WhatsApp Interview Scheduler",
    start: {
      dateTime: start,
      timeZone: "Asia/Kolkata"
    },
    end: {
      dateTime: end,
      timeZone: "Asia/Kolkata"
    },
    attendees: [
      { email: candidateEmail },
      { email: managerEmail }
    ],
    conferenceData: {
      createRequest: {
        requestId: "meet-" + Date.now(),
        conferenceSolutionKey: { type: "hangoutsMeet" }
      }
    }
  }
}

  try {
  const res = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
    conferenceDataVersion: 1,
    sendUpdates: "all"
  })

  console.log("✅ Event created:", res.data.htmlLink)

} catch (error) {
  console.error("❌ GOOGLE CALENDAR ERROR:", error.response?.data || error.message)
}

module.exports = createCalendarEvent