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

// ✅ MAIN FUNCTION
async function createCalendarEvent({ date, time, candidateEmail, managerEmail }) {
  try {
    // 👉 date = "2026-05-19"
    // 👉 time = "14:00:00"

    const startDateTime = `${date}T${time}+05:30`

    console.log("✅ FINAL START:", startDateTime)

    // 👉 Create end time (+30 mins)
    const endDate = new Date(startDateTime)
    endDate.setMinutes(endDate.getMinutes() + 30)

    const event = {
      summary: "Interview",

      start: {
        dateTime: startDateTime,
        timeZone: "Asia/Kolkata"
      },

      end: {
        dateTime: endDate.toISOString(),
        timeZone: "Asia/Kolkata"
      },

      attendees: [
        { email: candidateEmail },
        { email: managerEmail }
      ],

      conferenceData: {
        createRequest: {
          requestId: "interview-" + Date.now(),
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      }
    }

    const res = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: "all"
    })

    console.log("✅ Event created:", res.data.htmlLink)
    console.log("✅ Meet link:", res.data.conferenceData?.entryPoints?.[0]?.uri)

    return res.data

  } catch (error) {
    console.error("❌ GOOGLE ERROR:", error.response?.data || error.message)
  }
}

module.exports = createCalendarEvent